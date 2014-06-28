var sanityApp = angular.module(
    "sanityApp",
    [
        'ngAnimate',
        'ui.bootstrap',
        'ngSocial',
        'LocalForageModule',
        'sanityAppControllers',
        'sanityAppDirectives',
        'sanityAppFilters',
        'sanityAppProviders',
        'sanityAppServices'
    ]
);

sanityApp.config(
[
    'googleApiProvider', '$localForageProvider',
    function( googleApiProvider, $localForageProvider ) {
        $localForageProvider.config({
            driver      : 'localStorageWrapper',
            name        : 'SanityGrid',
            version     : 1.0,
            storeName   : 'default',
            description : 'The grid for people who like to stay sane'
        });
    }
]
);

function googleOnLoadCallback() {
    angular.bootstrap(document, ["sanityApp"]);
}

sanityApp.run(
[
    '$rootScope', '$localForage',
    function( $rootScope, $localForage ) {
        $localForage.bind( $rootScope, 'accounts', [] );

        $rootScope.clientSecretsPresent = false;

        $rootScope.currentUser = { id: '', name: '' };

        $rootScope.accounts = [];

        $rootScope.apiReady = true;

        $rootScope.clientSecrets = { clientId : '', apiKey : '' };

        var loadClientSecrets = function() {
            var clientSecretsLoaded = false;
            $localForage.getItem("clientSecrets")
                .then(function(data) {
                    if (data) {
                        $rootScope.clientSecrets.clientId = data.clientId;
                        $rootScope.clientSecrets.apiKey = data.apiKey;
                        $rootScope.clientSecretsPresent = true;
                    }
                    clientSecretsLoaded = true;
                });
            while (!clientSecretsLoaded) {
                // i know this is bad... if someone can tell me how i can
                // read values with localforgae in a synchronous way, i
                // will do it
            }
        };

        loadClientSecrets();

        if ( $.isEmptyObject( $rootScope.settings ) ) {
            $rootScope.settings = {
                hidewatched: false,
                hidemuted:   true,
                theme:       'default'
            };
        }

        if ( typeof $rootScope.videos == 'object' ) {
            $rootScope.videos = [];
        }

        if ( $.isEmptyObject( $rootScope.channelstate ) ) {
            $rootScope.channelstate = {};
            $rootScope.channelstate.hidden = {};
            $rootScope.channelstate.zipped = {};
        }

        if ( $.isEmptyObject( $rootScope.filters ) ) {
            $rootScope.filters = {};
            $rootScope.filters.count = 0;
            $rootScope.filters.caught = 0;
            $rootScope.filters.global = [];
        }

        if ( typeof $rootScope.filters.global == 'undefined' ) {
            $rootScope.filters = {};
            $rootScope.filters.count = 0;
            $rootScope.filters.caught = 0;
            $rootScope.filters.global = [];
            $rootScope.filters.channels = {};
        }

        if ( typeof $rootScope.filters.channels == 'undefined' ) {
            $rootScope.filters.channels = {};
        }

        if ( $.isArray( $rootScope.videocache ) ) {
            $rootScope.videocache = {};
        }

        if ( typeof $rootScope.settings.adblocksecret == 'undefined' ) {
            $rootScope.settings.adblocksecret = Math.random().toString(36).substr(2);

            $rootScope.settings.adblockoverride = false;
        }

        if ( typeof $rootScope.settings.videolimit == 'undefined' ) {
            $rootScope.settings.videolimit = 100;
        }
    }
]
);

