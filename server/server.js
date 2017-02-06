"use strict";

let _ = require("underscore");
let HTTPStatus = require('http-status');
let express = require("express");
let jsonfile = require("jsonfile");
let request = require("request");
let Promise = require("promise");
let gender = require("gender-guess");

let read = Promise.denodeify(jsonfile.readFile);
let HTTPGet = Promise.denodeify(request);

const CONFIG_PATH = "./config.json";

module.exports = function() {
    let app = express();

    let pagination;
    let dbConnection;

    //I could use callbacks here, but I rather avoid callback hell at all costs
    read(CONFIG_PATH)
        .then(config => {
            dbConnection = config.dbConnectionURL;
            pagination = config.pagination;
        });

    let normalize = function(input) {
        // or I could use Array.isArray(obj)
        return (_.isArray(input) ? input.map(item => item.toLowerCase().trim()) : input.toLowerCase().trim());
    };

    //Allow CORS!
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    /*
     * Ideally I would return an HTML explaining how to use this API with 
     * examples and all that jazz
     */
    app.get("/", (req, res, next) => {
        res.send("Usage of the API is /api/v1/gnomes/");
    });

    app.get("/api/v1/gnomes/", (req, res, next) => {

        //lets imagine this is a request to a database
        HTTPGet(dbConnection)
            .then(data => {

                /*
                 * Now we process the data !
                 * If using a real database I would be using Mongoose, but since
                 * this is just a prototype I just go ahead and mess with arrays
                 */
                let matchingEntries = JSON.parse(data.body).Brastlewark;

                let responseObj = {};
                responseObj.entries = [];
                responseObj.totalPages = 1;

                try {
                    if (req.query.id) {
                        let gnomeId = +normalize(req.query.id);

                        //check filter  VS find
                        //Using Filter to allow compatibility with the other 
                        //search options
                        matchingEntries = _.filter(matchingEntries, gnome => {
                            return gnome.id === gnomeId;
                        });
                    }

                    if (req.query.professions) {
                        let inputProfessions = normalize(req.query.professions.split(","));
                        let gnomeProfessions;

                        matchingEntries = _.filter(matchingEntries, gnome => {
                            gnomeProfessions = normalize(gnome.professions);

                            return _.every(inputProfessions, prof => {
                                return _.contains(gnomeProfessions, prof);
                            });

                            //this is an alternative way of doing it using ECMA6
                            // return gnomeProfessions.every(prof => _.contains(gnomeProfessions, prof));
                        });
                    }

                    //Our heroes may have a fetiche of some kind ... don't ask me ...
                    if (req.query.hairColor) {
                        let hairColor = normalize(req.query.hairColor);

                        matchingEntries = _.filter(matchingEntries, gnome => {
                            return normalize(gnome.hair_color) === hairColor;
                        });
                    }
                }
                catch (Exception) {
                    res.status(HTTPStatus.INTERNAL_SERVER_ERROR);
                    res.send(JSON.stringify({
                        code: HTTPStatus.INTERNAL_SERVER_ERROR,
                        message: "The server crashed into a horrible death while filtering your request",
                        info: Exception
                            //Ideally, would also add URL for extra documentation.
                    }));
                    return;
                }

                // or I could use _.isEmpty(result)
                if (matchingEntries.length === 0) {
                    res.status(HTTPStatus.NOT_FOUND);
                    res.send(JSON.stringify({
                        code: HTTPStatus.NOT_FOUND,
                        message: "The resource you were looking for was not found"
                            //Ideally, would also add URL for extra documentation.
                    }));
                    return;
                }

                let pageNum = +(req.query.page || 1);
                let itemsPerPage = +(req.query.itemsPerPage || pagination.itemsPerPage);

                if (itemsPerPage < 1 || pageNum < 1) {
                    res.status(HTTPStatus.BAD_REQUEST);
                    res.send(JSON.stringify({
                        code: HTTPStatus.BAD_REQUEST,
                        message: "The pagination parameters are incorrect. All pagination parameters must be > 0.",
                    }));
                    return;
                }
                
                let dividedArray = [];
                while (matchingEntries.length) {
                    dividedArray.push(matchingEntries.splice(0, itemsPerPage));
                }

                pageNum = (pageNum > dividedArray.length ? dividedArray.length - 1 : pageNum - 1);
                responseObj.entries = dividedArray[pageNum];
                
                //only guess the name for the entries the client will see
                for(let gnome of responseObj.entries){
                    gnome.gender = gender.guess(gnome.name);
                }
                
                responseObj.totalPages = dividedArray.length;
                responseObj.itemsPerPage = itemsPerPage;
                
                res.send(responseObj);
            })
            .catch((Exception) => {
                res.status(HTTPStatus.INTERNAL_SERVER_ERROR);
                res.send(JSON.stringify({
                        code: HTTPStatus.INTERNAL_SERVER_ERROR,
                        message: "The server found unknown problems while processing the request",
                        info: Exception
                        //Ideally, would also add URL for extra documentation.
                    }));
                //We would write this into a log file for later evaluation
                console.log(Exception);
            });
    });

    return app;
};