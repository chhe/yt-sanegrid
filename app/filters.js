var sanityAppFilters = angular.module('sanityAppFilters', []);

sanityAppFilters.filter('duration',
    function () {
        return function ( d ) {

            if (d.indexOf("M") != -1) {
                var duration = d.split('M'); // PT35M2S
            } else {
                var duration = ("PT0M" + d.substring(2)).split('M') // PT26S
            }


            duration[0] = Number(duration[0].slice(2));
            duration[1] = Number(duration[1].slice(0,-1));

            var h = Math.floor( duration[0] / 60 );
            var m = Math.floor( duration[0] % 60 );
            var s = duration[1];

            return (
                ( h > 0 ? h + ":" : "" )
                + ( m > 0 ? (h > 0 && m < 10 ? "0" : "" ) + m + ":" : "00:")
                + (s < 10 ? "0" : "") + s
                );
        };
    }
);

sanityAppFilters.filter('timestamp',
    function () {
        return function ( d ) {
            return new Date( d ).getTime();
        };
    }
);
