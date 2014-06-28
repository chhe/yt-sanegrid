var sanityAppControllers = angular.module('sanityAppControllers', []);

sanityAppControllers.controller('StartCtrl',
[



]);

sanityAppControllers.controller('YouTubeAccountCtrl',
[
    'ytApp', 'googleApi', 'ytData',  'appLoading',
    function ( $rootScope, $scope, $q, $localForage, $document, ytApp, googleApi, ytData, appLoading ) {

        $localForage.bind( $scope, 'settings', {} );
        $localForage.bind( $scope, 'channelstate', {} );
        $localForage.bind( $scope, 'filters', {} );

        $localForage.bind( $scope, 'videos', [] );
        $localForage.bind( $scope, 'videoids', [] );

        $scope.channels = [];
        $scope.channelids = [];

        $scope.videos = [];
        $scope.videoids = [];

        $scope.archive = [];
        $scope.archiveids = [];

        $scope.trash = [];
        $scope.trashids = [];

        var setAndStoreCurrentUser = function ( accountInfo ) {
            $rootScope.currentUser.id = accountInfo.id;
            $rootScope.currentUser.name = accountInfo.title;
            return $localForage.setItem("currentUser", $rootScope.currentUser);
        };


        var loadCurrentUser = function( fn ) {
            $localForage.getItem("currentUser")
                .then(function(data) {
                    if (data) {
                        $rootScope.currentUser.id = data.id;
                        $rootScope.currentUser.name = data.name;
                    }
                    fn();
                });
        };

        var initAccount = function ( accountInfo ) {
            $scope.start = false;

            $rootScope.settings.sidebar = false;

            setAndStoreCurrentUser(accountInfo)
                .then(function () {
                    appLoading.loading();

                    syncChannels().then(function() {
                        loadVideos().then(function(count) {
                            // TODO: display count
                            appLoading.ready();
                        });
                    });
                });
        };

        var retrieveNewAccountInfo = function(page) {
            var deferred = $q.defer();

            if ( typeof page == 'undefined' ) {
                page = null;
            }

            ytData.channels()
                .then(function(data) {
                    var accountId = data.items[0].id;
                    var accountTitle = data.items[0].snippet.title;
                    var account = $.grep($rootScope.accounts, function(account){ return account.id == accountId; });
                    if (account.length == 0) {
                        $rootScope.accounts.push({
                            id: accountId,
                            title: accountTitle
                        });
                    }

                    deferred.resolve({
                        id   : data.items[0].id,
                        name : data.items[0].snippet.title
                    });
                });

            return deferred.promise;
        };

        var loadChannels = function ( data, page ) {
            var deferred = $q.defer();

            if ( typeof page == 'undefined' ) page = '';

            if ( typeof data.items != 'undefined' ) {
                appendChannels(data.items)
                    .then(function() {
                        if ( ($scope.channels.length < data.pageInfo.totalResults) && data.nextPageToken != page ) {
                            syncChannels(data.nextPageToken)
                                .then(function() {
                                    deferred.resolve();
                                })
                        } else {
                            deferred.resolve();
                        }
                    });
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        };

        var appendChannels = function ( items )
        {
            var deferred = $q.defer();

            var len = items.length-1;

            for ( var i = 0; i < items.length; i++ ) {
                if ( $.inArray( items[i].id, $scope.channelids ) == -1 ) {
                    $scope.channels.push(
                        {
                            id: items[i].id,
                            title: items[i].snippet.title,
                            description: items[i].snippet.description,
                            channelId: items[i].snippet.resourceId.channelId
                        }
                    );

                    $scope.channelids.push(items[i].id);
                }

                if ( i === len ) {
                    deferred.resolve();
                }
            }

            return deferred.promise;
        };

        var syncChannels = function(page)
        {
            var deferred = $q.defer();

            if ( typeof page == 'undefined' ) {
                page = null;
            }

            ytData.subscriptions(page)
                .then(function(data){
                    loadChannels(data, page)
                        .then(function() {
                            deferred.resolve();
                        });
                });

            return deferred.promise;
        };

        var channelVideos = function( channel ) {
            var deferred = $q.defer();

            ytData.channelvideos( channel )
                .then(function(data) {
                    pushVideos(data.items)
                        .then(function(count) {
                            deferred.resolve(count);
                        });
                });

            return deferred.promise;
        };

        var loadVideos = function() {
            var deferred = $q.defer();

            var count = 0;

            var len = $scope.channels.length - 1;

            for ( var i = 0; i < $scope.channels.length; i++ ) {
                channelVideos($scope.channels[i].channelId)
                    .then(function(entries) {
                        count += entries;

                        if ( i === len ) {
                            deferred.resolve(count);
                        }
                    }(i));
            }

            return deferred.promise;
        };

        var pushVideos = function ( data ) {
            var deferred = $q.defer();

            if ( typeof data != 'undefined' ) {
                extractVideoIds(data)
                    .then(function(ids){
                        pushVideoIds(ids)
                            .then(function(count){
                                deferred.resolve(count);
                            });
                    });
            } else {
                deferred.reject();
            }

            return deferred.promise;
        };

        var extractVideoIds = function ( array ) {
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
        };

        var pushVideoIds = function ( list ) {
            var deferred = $q.defer();

            ytData.videos( list )
                .then(function(data) {
                    if ( typeof data.items != 'undefined' ) {
                        var len = data.items.length - 1;

                        var count = 0;

                        for ( var i = 0; i < data.items.length; i++ ) {
                            if ( pushVideo(data.items[i]) ) {
                                count++;
                            }

                            if ( i === len ) {
                                deferred.resolve(count);
                            }
                        }
                    } else {
                        deferred.resolve(0);
                    }
                });

            return deferred.promise;
        };

        var pushVideo = function ( video ) {
            var details = {
                id:          video.id,
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
                duration:    video.contentDetails.duration
            };

            var existing = $.inArray( video.id, $scope.videoids );

            if ( existing != -1 ) {
                // Update existing data
                $.each(
                    [
                        'id', 'link', 'title', 'thumbnail', 'channelId',
                        'author', 'authorlink', 'published', 'duration'
                    ],
                    function ( i, v ) {
                        $scope.videos[existing][v] = details[v];
                    }
                );

                return null;
            } else {
                var trash = false;

                if ( $rootScope.filters.channels.hasOwnProperty(details.channelId) ) {
                    $.each( $rootScope.filters.channels[details.channelId].filters, function ( i, v ) {
                        if ( details.title.indexOf( v.string) != -1 ) {
                            trash = true;
                        }
                    });
                }

                if ( trash ) {
                    $rootScope.filters.caught++;
                }

                if ( trash ) {
                    $scope.trash.push( details );
                    $scope.trashids.push( details.id );
                } else {
                    $scope.videos.push( details );
                    $scope.videoids.push( details.id );
                }

                return true;
            }
        };

        var loadTop = function () {
            appLoading.loading();

            $rootScope.filters.caught = 0;

            loadVideos();
        };

        $scope.connectNewAccount = function() {
            googleApi.authorizeNewAccount()
                .then(function() {
                    retrieveNewAccountInfo()
                        .then(function ( user ) {
                            initAccount( { id: user.id, title: user.name });
                            updateSidebar();
                            //loadTop();
                        });
                });
        };

        $scope.connect = function( userId ) {
            googleApi.authorize( userId )
                .then(function(){
                    var account = $.grep($rootScope.accounts, function(account){ return account.id == userId; });
                    initAccount( { id: userId, title: account[0].title } );
                    //loadTop();
                    updateSidebar();
                });
        };

        $scope.refresh = function() {
            appLoading.loading();

            ytApp.update();

            loadTop();
        };

        loadCurrentUser(function() {
            if ($scope.clientSecretsPresent && $rootScope.currentUser.id && $rootScope.currentUser.name ) {
                $scope.start = false;

                $rootScope.settings.sidebar = false;

                googleApi.checkAuth( $rootScope.currentUser.id )
                    .then(function(){
                        initAccount( { id: $rootScope.currentUser.id, title: $rootScope.currentUser.name } );
                        //loadTop();
                        updateSidebar();
                    });
            }
        });
    }
]);

sanityAppControllers.controller('AppRepeatCtrl',
[
    '$rootScope', '$scope', '$q', '$localForage', '$document',
    function ( $rootScope, $scope, $q, $localForage, $document ) {

        $scope.start = true;

        var updateSidebar = function () {
            if ( $rootScope.settings.sidebar === true ) {
                $('.sidebar' ).css({"height":$document.height()});
            } else {
                $('.sidebar' ).css({"height":"40px"});
            }
        };

        $scope.storeClientSecrets = function() {
            $localForage.setItem("clientSecrets", $rootScope.clientSecrets);
            if ($rootScope.clientSecrets.apiKey && $rootScope.clientSecrets.clientId) {
                $rootScope.clientSecretsPresent = true;
            } else {
                $rootScope.clientSecretsPresent = false;
            }
        }

        $scope.resetClientSecrets = function() {
            $rootScope.clientSecrets.apiKey = '';
            $rootScope.clientSecrets.clientId = '';
            $scope.storeClientSecrets();
        }

        $scope.selectUserid = function ( userId ) {
            if ( userId === false ) {
                $scope.start = true;

                setAndStoreCurrentUser( { id: '', title: ''} );
            } else {
                $scope.connect( userId );
                 //loadTop();
            }
        };

        $scope.hideChannel = function ( name ) {
            var pos = $.inArray( name, $rootScope.channeloptions.hidden );

            if ( pos != -1 ) {
                $rootScope.channeloptions.hidden = $rootScope.channeloptions.hidden.splice(pos, 1);
            } else {
                $rootScope.channeloptions.hidden.push(name);
            }
        };

        $scope.togglesidebar = function () {
            $rootScope.settings.sidebar = !$rootScope.settings.sidebar;

            updateSidebar();
        };

        $scope.videoFilter = function (video) {
            if ( ( (video.muted && ($rootScope.settings.hidemuted == "1")) || (video.watched && ($rootScope.settings.hidewatched == "1")) ) ) {
                return null;
            }

            if ( $rootScope.channelstate.hidden[video.channelId] === "1" ) {
                return null;
            }

            var filtered = false;

            $.each( $rootScope.filters.global, function ( i, v ) {
                if ( video.title.indexOf( v.string ) != -1 ) {
                    filtered = true;
                }
            });

            if ( filtered ) {
                $rootScope.filters.caught++;

                video.muted = true;

                return null;
            }

            return video;
        };

        $scope.setLimit = function (increment) {
            $rootScope.settings.videolimit =
                Number($rootScope.settings.videolimit) + Number(increment)
            ;

            if ( $rootScope.settings.videolimit < 1 ) {
                $rootScope.settings.videolimit = 5;
            }
        };

        var getPercentage = function () {
            if ( $rootScope.settings.videolimit < $scope.videos.length ) {
                $scope.percentage = parseInt(100 * $rootScope.settings.videolimit / $scope.videos.length);

                $scope.abslength = $rootScope.settings.videolimit;
            } else {
                $scope.percentage = 100;

                $scope.abslength = $scope.videos.length;
            }
        };

        $scope.$watch('videos', getPercentage, true);

        $scope.$watch('settings', getPercentage, true);

        $scope.percentage = getPercentage();

        angular.element($document).bind("keyup", function(event) {
            if (event.which === 82) $scope.refresh();
        });

        if ($rootScope.clientSecrets.apiKey && $rootScope.clientSecrets.apiKey) {
            $rootScope.clientSecretsPresent = true;
        } else {
            $rootScope.clientSecretsPresent = false;
        }

    }
]
);

sanityAppControllers.controller('SettingsModalCtrl',
    [
        '$scope', '$modal',
        function ($scope, $modal) {
            $scope.open = function () {
                var modalInstance = $modal.open({
                    templateUrl: 'templates/settings.html',
                    backdrop: false,
                    dialogFade:true,
                    controller: 'SettingsModalInstanceCtrl',
                    scope: $scope
                });
            };
        }
    ]
);

sanityAppControllers.controller('SettingsModalInstanceCtrl',
    [
        '$rootScope', '$scope', '$localForage', '$modalInstance',
        function ($rootScope, $scope, $localForage, $modalInstance) {
            $localForage.bind( $rootScope, 'filters', {} );

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.redoadblocksecret = function () {
                $rootScope.settings.adblocksecret = Math.random().toString(36).substr(2);
            };

            $scope.removeFilter = function (channel, id) {
                if ( channel.length ) {
                    $rootScope.filters.channels[channel].filters.splice(id,1);

                    if ( $rootScope.filters.channels[channel].filters.length === 0 ) {
                        delete $rootScope.filters.channels[channel];
                    }
                } else {
                    $rootScope.filters.global.splice(id,1);
                }

                $rootScope.filters.count--;
            };
        }
    ]
);

sanityAppControllers.controller('SupportModalCtrl',
    [
        '$scope', '$modal',
        function ($scope, $modal) {
            $scope.open = function () {
                var modalInstance = $modal.open({
                    templateUrl: 'templates/support.html',
                    backdrop: false,
                    dialogFade:true,
                    controller: 'SupportModalInstanceCtrl'
                });
            };
        }
    ]
);

sanityAppControllers.controller('SupportModalInstanceCtrl',
    [
        '$scope', '$modalInstance',
        function ($scope, $modalInstance) {
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    ]
);

sanityAppControllers.controller('FilterModalCtrl',
    [
        '$scope', '$modal',
        function ($scope, $modal)
        {
            $scope.open = function (video) {
                var modalInstance = $modal.open({
                    templateUrl: 'templates/filter.html',
                    backdrop: false,
                    dialogFade:true,
                    controller: 'FilterModalInstanceCtrl',
                    scope: $scope,
                    resolve: {
                        item: function () {
                            return video;
                        }
                    }
                });
            };
        }
    ]
);

sanityAppControllers.controller('FilterModalInstanceCtrl',
    [
        '$rootScope', '$scope', '$localForage', '$modalInstance', 'item',
        function ($rootScope, $scope, $localForage, $modalInstance, item)
        {
            $scope.filter = {
                title: item.title,
                channelId: item.channelId,
                author: item.author
            };


            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.ok = function (item) {
                if ( $scope.filter.channelId.length ) {
                    if ( typeof $rootScope.filters.channels[$scope.filter.channelId] == 'undefined' ) {
                        $rootScope.filters.channels[$scope.filter.channelId] = {
                            title: $scope.filter.channelId,
                            filters: []
                        };
                    }

                    $rootScope.filters.channels[$scope.filter.channelId].filters.push({string:$scope.filter.title});
                } else {
                    $rootScope.filters.global.push({string:$scope.filter.title});
                }

                $rootScope.filters.count++;

                $modalInstance.dismiss('ok');
            };
        }
    ]
);

sanityAppControllers.controller('UpdatesModalCtrl',
    [
        '$rootScope', '$scope', '$modal', 'ytApp',
        function ($rootScope, $scope, $modal, ytApp) {
            $scope.status = $rootScope.status;

            $scope.open = function () {
                var modalInstance = $modal.open({
                    templateUrl: 'templates/updates.html',
                    backdrop: false,
                    dialogFade:true,
                    controller: 'UpdatesModalInstanceCtrl',
                    scope: $scope
                });
            };
        }
    ]
);

sanityAppControllers.controller('UpdatesModalInstanceCtrl',
    [
        '$rootScope', '$scope', '$localForage', '$modalInstance', 'ytApp',
        function ($rootScope, $scope, $localForage, $modalInstance, ytApp) {
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    ]
);

sanityAppControllers.controller('SettingsTabsCtrl',
    [
        '$rootScope', '$scope',
        function ($rootScope, $scope) {
            $scope.tabs = [];

            $scope.navType = 'pills';

            $scope.adblockadvice = 'firefox';

            $scope.adblockswitch = function( type ) {
                $scope.adblockadvice = type;
            };
        }
    ]
);

sanityAppControllers.controller('SettingsAccordionCtrl',
    [
        '$scope',
        function ($scope) {
            $scope.oneAtATime = true;
        }
    ]
);
