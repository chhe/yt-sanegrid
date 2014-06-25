var sanityAppProviders = angular.module('sanityAppProviders', []);

sanityAppProviders.provider('googleApi', function GoogleApiProvider () {
    var self = this;

    this.scopes = 'https://www.googleapis.com/auth/youtube';

    this.gapi = gapi;

    this.q = {};

    this.connect = function()
    {
        var deferred = self.q.defer();

        this.gapi.auth.authorize(
            {
                client_id: this.clientId,
                scope: this.scopes,
                immediate: false
            },
            function( result ) {
                if ( result && !result.error ) {
                    self.gapi.client.load('youtube', 'v3', function(response) {
                        deferred.resolve(response);
                    });
                } else {
                    deferred.reject();
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

        this.gapi.client.setApiKey(this.apiKey);
    };

    this.$get = [
        '$q',
        function ( $q )
        {
            var provider = new GoogleApiProvider();

            provider.q = $q;

            $.getJSON("/yt-sanegrid/client.json")
                .fail( function ( j, t, e ) {
                    alert( "Error reading client secrets!" );
                }).done( function ( json ) {
                    provider.clientId = json.clientId;
                    provider.apiKey = json.apiKey;
                });

            return provider;
        }
    ];

});
