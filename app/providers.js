var sanityAppProviders = angular.module('sanityAppProviders', []);

sanityAppProviders.provider('googleApi', function GoogleApiProvider () {
    var self = this;

    this.scopes = 'https://www.googleapis.com/auth/youtube';

    this.gapi = gapi;

    this.q = {};

    $.getJSON("/yt-sanegrid/client.json")
        .fail( function ( j, t, e ) {
            alert( "Error reading client secrets!" );
        }).done( function ( json ) {
            self.clientId = json.clientId;
            self.apiKey = json.apiKey;
            self.gapi.client.setApiKey(self.apiKey);
        });

    this.authorizeToGoogle = function( doImmediate, authCallBack ) {
        this.gapi.auth.authorize(
            {
                client_id: self.clientId,
                scope: self.scopes,
                immediate: doImmediate
            },
            authCallBack
        )
    };

    this.loadGoogleApi = function( callBack ) {
        this.gapi.client.load('youtube', 'v3', callBack );
    };

    this.connect = function()
    {
        var deferred = self.q.defer();

        self.authorizeToGoogle(true,
            function( result ) {
                if ( result && !result.error && result.name != 'TypeError') {
                    self.loadGoogleApi(function(response) {
                        deferred.resolve(response);
                    });
                } else {
                    self.authorizeToGoogle(false, function( result ) {
                        if ( result && !result.error ) {
                            self.loadGoogleApi(function(response) {
                                deferred.resolve(response);
                            });
                        } else {
                            deferred.reject();
                        }
                    });
                }
            }
        );

        return deferred.promise;
    };

    this.checkAuth = function() {
        return this.connect();
    };

    this.authorize = function() {
        return this.connect();
    };

    this.load = function() {
        this.gapi.load();
    };

    this.$get = [
        '$q',
        function ( $q )
        {
            var provider = new GoogleApiProvider();

            provider.q = $q;

            return provider;
        }
    ];

});
