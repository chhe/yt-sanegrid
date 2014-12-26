(function () {

	angular.module('sanityData', ['youtube', 'pouchdb']);


	function YTConnectionService( $rootScope, $q, ytData, accounts, videos, channels, archive, trash )
	{
		return {
			migrateOldLS: function() {
				// Find the old userid
				// Convert old properties to new
				// - Thumbnail
				// - Duration
				// Sort into right container
			}
		}
	}

	YTConnectionService.$inject = ['$rootScope', '$q', 'ytData', 'accounts', 'videos', 'channels', 'archive', 'trash'];
	angular.module('sanityData').service('connection', YTConnectionService);


	function MultiAccountDataService( $rootScope, $q, accounts, videos, channels )
	{
		return {
			init: function() {
				var deferred = $q.defer();

				accounts.init()
					.then(function() {
						$rootScope.userid = accounts.current;

						channels.init();

						channels.pageChannels()
							.then(function(){
								videos.init();

								videos.loadVideos()
									.then(function() {
										deferred.resolve(videos.countLastAdded);
									});
							});
					});

				return deferred.promise;
			}
		}
	}

	MultiAccountDataService.$inject = ['$rootScope', '$q', 'accounts', 'videos', 'channels'];
	angular.module('sanityData').service('data', MultiAccountDataService);


	function AccountService( $q, ytData, pouchDB )
	{
		return {
			data: pouchDB('ytSanityDB/v0/accounts'),
			current: '',
			doc: null,
			init: function(page) {
				var deferred = $q.defer(),
					self = this;

				if ( typeof page == 'undefined' ) {
					page = null;
				}

				ytData.channels()
					.then(function(data) {
						self.findAccount(data.items[0].id)
							.then(function(doc){
								self.doc = doc;

								self.current = doc.id;

								deferred.resolve();
							}, function(){
								self.data.post({
									ytId: data.items[0].id,
									title: data.items[0].snippet.title
								} ).then(function(doc){
									self.doc = doc;

									self.current = doc.id;

									deferred.resolve();
								});
							});
					}, function() {
						deferred.reject();
					});

				return deferred.promise;
			},
			findAccount: function( id ) {
				var deferred = $q.defer();

				function map(doc) {
					if ( doc.ytId == id ) {
						emit(doc._id, doc);
					}
				}

				this.data.query({map: map}, {reduce: false})
					.then(function(res) {
						if ( res.total_rows > 0 ) {
							deferred.resolve(res.rows[0]);
						} else {
							deferred.reject();
						}
					});

				return deferred.promise;
			}
		}
	}

	AccountService.$inject = ['$q', 'ytData', 'pouchDB'];
	angular.module('sanityData').service('accounts', AccountService);


	function VideoService( $q, $rootScope, ytData, pouchDB, accounts, channels )
	{
		return {
			data: null,
			countLastAdded: 0,

			init: function() {
				this.data = pouchDB('ytSanityDB/v0/' + accounts.current + '/videos');
			},

			bind: function( scope ) {
				var deferred = $q.defer();

				self.data.allDocs().then(function(list){
					scope.videos = list;

					deferred.resolve();
				});

				return deferred.promise;
			},

			loadVideos: function() {
				var deferred = $q.defer();

				var promises = [];

				var self = this;

				this.countLastAdded = 0;

				channels.data.allDocs().then(function(list){
					angular.forEach(list, function(channel) {
						var promise = $q.defer();

						promises.push(promise);

						self.channelVideos(channel.channelId).then(function(){
							promise.resolve();
						}, function(){
							promise.resolve();
						});
					});
				});

				$q.all(promises).then(function(){
					deferred.resolve();
				});

				return deferred.promise;
			},

			channelVideos: function( channel ) {
				var deferred = $q.defer();

				var self = this;

				ytData.channelvideos(channel)
					.then(function(data) {
						return self.pushVideos(data.items)
					})
					.then(function() {
						deferred.resolve();
					}, function() {
						deferred.reject();
					});

				return deferred.promise;
			},

			pushVideos: function ( data ) {
				var deferred = $q.defer();

				var self = this;

				if ( typeof data != 'undefined' ) {
					self.extractVideoIds(data)
						.then(function(ids){
							return self.pushVideoIds(ids)
						})
						.then(function(count){
							deferred.resolve(count);
						});
				} else {
					deferred.reject();
				}

				return deferred.promise;
			},

			extractVideoIds: function ( array ) {
				var deferred = $q.defer();

				var list = [];

				var len = array.length - 1;

				for ( var i = 0; i < array.length; i++ ) {
					if ( typeof array[i].contentDetails == 'undefined' ) continue;

					if ( typeof array[i].contentDetails.upload != 'undefined' ) {
						list.push(array[i].contentDetails.upload.videoId);

						if ( i === len ) {
							deferred.resolve(list);
						}
					} else if ( i === len ) {
						deferred.resolve(list);
					}
				}

				return deferred.promise;
			},

			pushVideoIds: function ( list ) {
				var deferred = $q.defer();

				var self = this;

				ytData.videos( list )
					.then(function(items) {
						var promises = [];

						angular.forEach(items, function(video) {
							var promise = $q.defer();

							promises.push(promise);

							self.videoExists(video.id)
								.then(function(){
									promise.resolve();
								}, function(){
									self.pushVideo(video).then(function(){
										self.countLastAdded++;

										promise.resolve();
									});
								});
						});

						$q.all(promises).then(function(){
							deferred.resolve();
						});
					}, function() {
						deferred.resolve(0);
					});

				return deferred.promise;
			},

			videoExists: function( id ) {
				var deferred = $q.defer();

				function map(doc) {
					if ( doc.id == id ) {
						emit(doc._id, doc);
					}
				}

				this.data.query({map: map}, {reduce: false})
					.then(function(res) {
						if ( res.total_rows > 0 ) {
							deferred.resolve();
						} else {
							deferred.reject();
						}
					});

				return deferred.promise;
			},

			pushVideo: function ( video ) {
				var deferred = $q.defer();

				var details = {
					ytId:        video.id,
					link:        'https://www.youtube.com/watch?v=' + video.id,
					title:       video.snippet.title,
					thumbnail:   {
						default: video.snippet.thumbnails.default.url,
						medium:  video.snippet.thumbnails.medium.url,
						high:    video.snippet.thumbnails.high.url
					},
					channelId:   video.snippet.channelId,
					author:      video.snippet.channelTitle,
					authorlink:  'https://www.youtube.com/channel/' + video.snippet.channelId,
					published:   video.snippet.publishedAt,
					duration:    video.contentDetails.duration,
					archive:     false,
					trash:       false
				};

				// TODO: This really needs to be a deferred service
				if ( $rootScope.filters.channels.hasOwnProperty(details.channelId) ) {
					$.each( $rootScope.filters.channels[video.channelId].filters, function ( i, v ) {
						if ( video.title.indexOf( v.string) != -1 ) {
							details.trash = true;

							$rootScope.filters.caught++;
						}
					});
				}

				this.data.create(details).then(function(){
					accounts.pushVideoId(details.id);

					deferred.resolve();
				});

				return deferred.promise;
			}
		}
	}

	VideoService.$inject = ['$q', '$rootScope', 'ytData', 'pouchDB', 'accounts', 'channels'];
	angular.module('sanityData').service('videos', VideoService);


	function ChannelService( $q, ytData, pouchDB, accounts )
	{
		return {
			data: null,

			init: function() {
				this.data = pouchDB('ytSanityDB/v0/' + accounts.current + '/channels');
			},

			pageChannels: function( page )
			{
				var deferred = $q.defer();

				var self = this;

				if ( typeof page == 'undefined' ) {
					page = null;
				}

				ytData.subscriptions(page)
					.then(function(data){
						return self.loadChannels(data, page)
					})
					.then(function() {
						deferred.resolve();
					});

				return deferred.promise;
			},

			loadChannels: function ( data, page ) {
				var deferred = $q.defer(),
					self = this;

				if ( typeof page == 'undefined' ) page = '';

				if ( typeof data.items != 'undefined' ) {
					self.appendChannels(data.items)
						.then(function() {
							if (
								// If we have not added all channels to the db
								(self.data.length() < data.pageInfo.totalResults)
								// and we're not at the last page of results yet
								&& (data.nextPageToken != page)
								) {
								self.pageChannels(data.nextPageToken)
									.then(function() {
										deferred.resolve();
									});
							} else {
								deferred.resolve();
							}
						});
				} else {
					deferred.resolve();
				}

				return deferred.promise;
			},

			appendChannels: function ( items ) {
				var promises = [],
					self = this;

				angular.forEach(items, function(item) {
					var promise = $q.defer();

					promises.push(promise);

					self.channelExists(item.id)
						.then(function(){
							promise.resolve();
						}, function(){
							self.data.post(
								{
									ytId: item.id,
									title: item.snippet.title,
									description: item.snippet.description,
									channelId: item.snippet.resourceId.channelId
								}
							).then(function(){
								promise.resolve();
							});
						});
				});

				return $q.all(promises);
			},

			channelExists: function( id ) {
				var deferred = $q.defer();

				function map(doc) {
					if ( doc.id == id ) {
						emit(doc._id, doc);
					}
				}

				this.data.query({map: map}, {reduce: false})
					.then(function(res) {
						if ( res.total_rows > 0 ) {
							deferred.resolve();
						} else {
							deferred.reject();
						}
					});

				return deferred.promise;
			}
		}
	}

	ChannelService.$inject = ['$q', 'ytData', 'pouchDB', 'accounts'];
	angular.module('sanityData').service('channels', ChannelService);


})();
