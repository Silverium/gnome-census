/*global angular*/

(function() {
    const app = angular.module("census-services", []);

    app.factory('ListService', function($http) {
        const list = {};
        list.data = {};

        list.request = function(params) {

            let paramsStr = "";
            if (params) {
                paramsStr += "?";
               
                for (let entry of Object.entries(params)) {
                    if (entry[1] !== null && entry[1] !== "undefined")
                        paramsStr += entry[0] + "=" + entry[1] + "&";
                }
                //remove last ampersand
                paramsStr = paramsStr.slice(0, -1);
            }

            const theUrl = 'https://restful-api-example-silveriumgoogler.c9users.io/api/v1/gnomes/' + paramsStr;

            console.log(theUrl);

            $http({
                method: 'GET',
                url: theUrl,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            }).then(function successCallback(response) {
                list.data.entries = response.data.entries;
                list.data.pagination = {
                    totalPages: response.data.totalPages,
                    itemsPerPage: response.data.itemsPerPage,
                    numberList: Array.apply(null, {
                        length: response.data.totalPages
                    }).map(Number.call, Number)
                };
            }, function errorCallback(response) {
                alert(response.data.message);
            });
        };

        return list;
    });

    app.factory("FilterService", function() {
        const filter = {data:{}};
        // filter.data = {};

        filter.reset = function() {
            filter.data = {};
        };

        return filter;
    });
}());