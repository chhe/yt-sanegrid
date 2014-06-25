var sanityAppServices = angular.module('sanityAppServices', []);

// From: http://jsfiddle.net/lrlopez/dFeuf/
sanityAppServices.service('timeAgoService',
    function($timeout) {
        var ref;
        return {
            nowTime: 0,
            initted: false,
            settings: {
                refreshMillis: 60000,
                allowFuture: false,
                strings: {
                    prefixAgo: null,
                    prefixFromNow: null,
                    suffixAgo: "ago",
                    suffixFromNow: "from now",
                    seconds: "less than a minute",
                    minute: "about a minute",
                    minutes: "%d minutes",
                    hour: "about an hour",
                    hours: "about %d hours",
                    day: "a day",
                    days: "%d days",
                    month: "about a month",
                    months: "%d months",
                    year: "about a year",
                    years: "%d years",
                    numbers: []
                }
            },
            doTimeout: function() {
                ref.nowTime = (new Date()).getTime();
                $timeout(ref.doTimeout, ref.settings.refreshMillis);
            },
            init: function() {
                if (this.initted === false) {
                    this.initted = true;
                    this.nowTime = (new Date()).getTime();
                    ref = this;
                    this.doTimeout();
                    this.initted = true;
                }
            },
            inWords: function(distanceMillis) {
                var $l = this.settings.strings;
                var prefix = $l.prefixAgo;
                var suffix = $l.suffixAgo;
                if (this.settings.allowFuture) {
                    if (distanceMillis < 0) {
                        prefix = $l.prefixFromNow;
                        suffix = $l.suffixFromNow;
                    }
                }

                var seconds = Math.abs(distanceMillis) / 1000;
                var minutes = seconds / 60;
                var hours = minutes / 60;
                var days = hours / 24;
                var years = days / 365;

                function substitute(stringOrFunction, number) {
                    var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
                    var value = ($l.numbers && $l.numbers[number]) || number;
                    return string.replace(/%d/i, value);
                }

                var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
                    seconds < 90 && substitute($l.minute, 1) ||
                    minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
                    minutes < 90 && substitute($l.hour, 1) ||
                    hours < 24 && substitute($l.hours, Math.round(hours)) ||
                    hours < 42 && substitute($l.day, 1) ||
                    days < 30 && substitute($l.days, Math.round(days)) ||
                    days < 45 && substitute($l.month, 1) ||
                    days < 365 && substitute($l.months, Math.round(days / 30)) ||
                    years < 1.5 && substitute($l.year, 1) ||
                    substitute($l.years, Math.round(years));

                var separator = $l.wordSeparator === undefined ?  " " : $l.wordSeparator;
                return $.trim([prefix, words, suffix].join(separator));
            }
        };
    }
);

sanityAppServices.service('appLoading',
    [
        '$rootScope',
        function ( $rootScope )
        {
            var timer;

            this.loading = function () {
                clearTimeout( timer );

                $rootScope.status = 1;
            };

            this.ready = function ( delay ) {
                function ready() {
                    $rootScope.status = 0;
                }

                clearTimeout( timer );

                delay = delay === null ? 500 : false;

                if ( delay ) {
                    timer = setTimeout( ready, delay );
                } else {
                    ready();
                }
            };
        }
    ]
);


sanityAppServices.service('ytData',
    [
        '$q', 'googleApi',
        function ( $q, googleApi ) {
            var self = this;

            this.get = function ( type, options ) {
                var deferred = $q.defer();

                googleApi.gapi.client.setApiKey(googleApi.apiKey);

                var request = googleApi.gapi.client.youtube[type].list(options);

                request.execute(function(response) {
                    deferred.resolve(response);
                });

                return deferred.promise;
            };

            this.subscriptions = function ( page ) {
                var options = {
                    part: 'snippet',
                    mine: true,
                    maxResults: 50
                };

                if ( typeof page != 'undefined' ) {
                    if ( page !== null ) {
                        options.page = page;
                    }
                }

                return self.get('subscriptions', options);
            };

            this.channels = function ( page ) {
                var options = {
                    part: 'snippet',
                    mine: true,
                    maxResults: 50
                };

                if ( typeof page != 'undefined' ) {
                    if ( page !== null ) {
                        options.page = page;
                    }
                }

                return self.get('channels', options);
            };

            this.channelvideos = function ( channel ) {
                return self.get(
                    'activities',
                    {
                        part: 'contentDetails',
                        channelId: channel,
                        maxResults: 20
                    }
                );
            };

            this.videos = function ( ids )
            {
                return self.get(
                    'videos',
                    {
                        part: 'snippet,contentDetails,status,statistics',
                        mine: true,
                        id: ids.join()
                    }
                );
            };
        }
    ]
);

sanityAppServices.service('ytApp',
    [
        '$q', '$rootScope',
        function ( $q, $rootScope ) {
            var versionHigher = function (v1, v2) {
                var v1parts = v1.split('.');
                var v2parts = v2.split('.');

                for (var i = 0; i < v1parts.length; ++i) {
                    if (v1parts[i] > v2parts[i]) return true;
                }

                return false;
            };

            this.appinfo = function ( fn ) {
                var url = "/yt-sanegrid/info.json";

                var defer = $q.defer();

                $.getJSON( url )
                    .fail( function ( j, t, e ) {
                        fn( e, j.status );
                    } )
                    .done( function ( json ) {
                        fn( json, 200 );
                    } );
            };

            this.appupdates = function ( fn ) {
                var daviddeutsch = new Gh3.User("daviddeutsch");

                var sanegrid = new Gh3.Repository("yt-sanegrid", daviddeutsch);

                sanegrid.fetch(function (err, res) {
                    if(err) { fn( err, 500 ); }
                });

                sanegrid.fetchClosedIssues(function (err, res) {
                    if(err) { fn( err, 500 ); }

                    fn( sanegrid.getIssues(), 200 );
                });
            };

            that = this;

            this.update = function() {
                that.appinfo( function( data, code ) {
                    if ( !versionHigher( data.version, $rootScope.info.version ) ) {
                        return;
                    }

                    $rootScope.info.update = data.version;
                    $rootScope.info.updates.outdated = true;
                    $rootScope.info.updates.new = 0;
                    $rootScope.info.updates.title = "Fresh Update(s)!";

                    that.appupdates( function( list, code ) {
                        $rootScope.info.updates.list = list;

                        $.each( $rootScope.info.updates.list, function ( i, v ) {
                            var date = new Date( v.updated_at );

                            if ( date > $rootScope.info.date ) {
                                $rootScope.info.updates.list[i].new = true;

                                $rootScope.info.updates.new++;
                            } else {
                                $rootScope.info.updates.list[i].new = false;
                            }
                        });
                    });
                });
            };

            this.appinfo( function( data, code ) {
                $rootScope.info = {
                    version: data.version,
                    updates: {list: []},
                    date: new Date()
                };

                that.appupdates( function( list, code ) {
                    $rootScope.info.updates.list = list;
                });
            });
        }
    ]
);
