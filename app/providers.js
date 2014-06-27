var sanityAppProviders = angular.module('sanityAppProviders', []);

function GoogleApi(gapi, clientId, scopes, q) {

    var self = this;

    this.gapi = gapi;
    this.q = q;
    this.clientId = clientId;
    this.scopes = scopes;

    this.authorizeToGoogle = function( userId, authCallBack ) {
        var parameters = {};
        parameters.client_id = this.clientId;
        parameters.scope = this.scopes;
        if (userId) {
            parameters.immediate = true;
            parameters.user_id = userId;
        } else {
            parameters.immediate = false;
            parameters.authuser = -1;
        }
        this.gapi.auth.authorize(parameters, authCallBack);
    };

    this.loadGoogleApi = function( callBack ) {
        this.gapi.client.load('youtube', 'v3', callBack );
    };

    this.connect = function( userId ) {
        var deferred = self.q.defer();

        self.authorizeToGoogle(userId,
            function( result ) {
                if ( result && !result.error && result.name != 'TypeError') {
                    self.loadGoogleApi(function(response) {
                        deferred.resolve(response);
                    });
                } else {
                    self.authorizeToGoogle(userId, function( result ) {
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

    this.checkAuth = function( userId ) {
        return this.connect( userId );
    };

    this.authorize = function( userId ) {
        return this.connect( userId );
    };

    this.authorizeNewAccount = function() {
        return this.connect();
    }

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
