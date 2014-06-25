var sanityAppDirectives = angular.module('sanityAppDirectives', []);

sanityAppDirectives.directive('timeAgo',
    [
        'timeAgoService',
        function(timeago) {
            return {
                replace: true,
                restrict: 'EA',
                scope: {
                    "fromTime":"@"
                },
                link: {
                    post: function(scope, linkElement, attrs) {
                        scope.timeago = timeago;
                        scope.timeago.init();
                        scope.$watch("timeago.nowTime-fromTime",function(value) {
                            if (scope.timeago.nowTime !== undefined) {
                                value = scope.timeago.nowTime-scope.fromTime;
                                $(linkElement).text(scope.timeago.inWords(value));
                            }
                        });
                    }
                }
            };
        }
    ]
);

sanityAppDirectives.directive('selectOnClick',
    function () {
        return function (scope, element, attrs) {
            element.bind('click', function () {
                this.select();
            });
        };
    }
);

sanityAppDirectives.directive('videoItem',
    function($timeout) {
        return {
            restrict: 'C',
            scope: {
                video: '='
            },
            templateUrl: 'templates/item.html',
            controller: function( $scope, $rootScope ) {
                $scope.mute = function () {
                    $scope.video.muted = !$scope.video.muted;
                    $scope.video.muteddate = new Date().toISOString();
                };

                $scope.watch = function ( $event ) {
                    if ( ($event.button == 2) ) {
                        return;
                    }

                    $timeout(function(){$scope.watched(false);}, 400);
                };

                if ( $rootScope.settings.adblockoverride ) {
                    $scope.link = $scope.video.link+"&adblock="+$rootScope.settings.adblocksecret;
                } else {
                    $scope.link = $scope.video.link;
                }

                $scope.watched = function ( force ) {
                    if ( $scope.video.watched && !force ) {
                        return;
                    }

                    $scope.video.watched = !$scope.video.watched;
                    $scope.video.watcheddate = new Date().toISOString();
                };
            }
        }
    }
);
