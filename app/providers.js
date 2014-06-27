var sanityAppProviders = angular.module('sanityAppProviders', []);

function GoogleApi(gapi, clientId, scopes, q) {

    var self = this;

    this.gapi = gapi;
    this.q = q;
    this.clientId = clientId;
    this.scopes = scopes;

    this.authorizeToGoogle = function( doImmediate, authCallBack ) {
        this.gapi.auth.authorize(
            {
                client_id: this.clientId,
                scope: this.scopes,
                immediate: doImmediate,
                authuser: 1
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

}

sanityAppProviders.provider('googleApi', function GoogleApiProvider () {
    var self = this;

    this.scopes = 'https://www.googleapis.com/auth/youtube';
    this.clientId = '';
    this.apiKey = '';
    this.gapi = gapi;

    this.config = function() {
        $.ajax({
            url: '/yt-sanegrid/client.json',
            async: false,
            dataType: 'json',
            success: function (response) {
                self.clientId = response.clientId;
                self.apiKey = response.apiKey;
                self.gapi.client.setApiKey(self.apiKey);
            }
        });
    };

    this.$get = [
        '$q',
        function ( $q ) {
            var googleApi = new GoogleApi(self.gapi, self.clientId, self.scopes, $q);

            return googleApi;
        }
    ];

});
