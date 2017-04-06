"use strict";

const HTTPStatus = require('http-status');
const express = require("express");
const jsonfile = require("jsonfile");
const request = require("request");
const Promise = require("promise");
const gender = require("gender-guess");
const normalize = require("../utils/normalize");

const read = Promise.denodeify(jsonfile.readFile);
const HTTPGet = Promise.denodeify(request);

const CONFIG_PATH = "./config.json";

module.exports = (function() {
    const api = express.Router();

    let pagination;
    let dbConnection;

    //I could use callbacks here, but I rather avoid callback hell at all costs
    read(CONFIG_PATH)
        .then(config => {
            dbConnection = config.dbConnectionURL;
            pagination = config.pagination;
        });

    

    //Allow CORS!
    api.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    /*
     * Ideally I would return an HTML explaining how to use this API with 
     * examples and all that jazz
     */
    api.get("/", (req, res, next) => {
        res.send("Usage of the API is /gnomes/");
    });

    api.get("/gnomes/", (req, res, next) => {

        //lets imagine this is a request to a database
        HTTPGet(dbConnection)
            .then(data => {

                /*
                 * Now we process the data !
                 * If using a real database I would be using Mongoose, but since
                 * this is just a prototype I just go ahead and mess with arrays
                 */
                let matchingEntries = JSON.parse(data.body).Brastlewark;

                const responseObj = {};
                responseObj.entries = [];
                responseObj.totalPages = 1;

                try {
                    if (req.query.id) {
                        const gnomeId = +normalize(req.query.id);

                        //Using Filter to allow compatibility with the other 
                        //search options
                        matchingEntries = matchingEntries.filter(gnome => gnome.id === gnomeId);
                    }

                    if (req.query.professions) {
                        const inputProfessions = normalize(req.query.professions.split(","));
                        let gnomeProfessions;

                        matchingEntries = matchingEntries.filter( gnome => {
                            gnomeProfessions = normalize(gnome.professions);
                            return inputProfessions.every( prof => gnomeProfessions.includes(prof));
                        });
                    }

                    //Our heroes may have a fetiche of some kind ... don't ask me ...
                    if (req.query.hairColor) {
                        const hairColor = normalize(req.query.hairColor);
                        matchingEntries = matchingEntries.filter(gnome => normalize(gnome.hair_color) === hairColor);
                    }
                }
                catch (Exception) {
                    res.status(HTTPStatus.INTERNAL_SERVER_ERROR);
                    res.json({
                        code: HTTPStatus.INTERNAL_SERVER_ERROR,
                        message: "The server crashed into a horrible death while filtering your request",
                        info: Exception
                            //Ideally, would also add URL for extra documentation.
                    });
                    return;
                }

                if (matchingEntries.filter(each=>each !== undefined && each !== null).length === 0) {
                    res.status(HTTPStatus.NOT_FOUND);
                    res.json({
                        code: HTTPStatus.NOT_FOUND,
                        message: "The resource you were looking for was not found"
                            //Ideally, would also add URL for extra documentation.
                    });
                    return;
                }

                let pageNum = +(req.query.page || 1);
                let itemsPerPage = +(req.query.itemsPerPage || pagination.itemsPerPage);

                if (itemsPerPage < 1 || pageNum < 1) {
                    res.status(HTTPStatus.BAD_REQUEST);
                    res.json({
                        code: HTTPStatus.BAD_REQUEST,
                        message: "The pagination parameters are incorrect. All pagination parameters must be > 0.",
                    });
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
                res.json({
                        code: HTTPStatus.INTERNAL_SERVER_ERROR,
                        message: "The server found unknown problems while processing the request",
                        info: Exception
                        //Ideally, would also add URL for extra documentation.
                    });
                //We would write this into a log file for later evaluation
                console.log(Exception);
            });
    });

    return api;
}());