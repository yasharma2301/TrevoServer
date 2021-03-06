const express = require('express');
const axios = require('axios');
var bodyParser = require('body-parser');
var cheerio = require('cheerio');
const app = express();
app.use(bodyParser());
const weatherAPIKey = "2a8b9265f132bb94031535187640dee1";
const airportCodeAPIKey = "419a7900b2";
const airportCodeSecret = "8dc38c00c1296ec";
// const vision = require('@google-cloud/vision');

// const client = new vision.ImageAnnotatorClient({
//     keyFilename: 'vision.json'
// });

// const fileName = './taj.jpg';

// client.landmarkDetection(fileName).then(result => {
//     const landmarks = result.landmarkAnnotations;
//     console.log('Landmarks:');
//     landmarks.forEach(landmark => console.log(landmark));
// });




app.get('/', (req, res) => {
    res.send("Trevo Server");
});




app.get('/attractions/:id', (req, res) => {
    res.setHeader('Content-type', 'application/json');
    let queryCityName = req.params.id;
    if (queryCityName == null) {
        res.send({ 'errorMessage': 'Pass a city to query results e.g., /attractions/delhi.' })
    } else {
        var url = 'https://www.holidify.com/places/' + queryCityName + '/sightseeing-and-things-to-do.html';
        axios.get(url)
            .then(urlRes => {
                let placesList = [];
                const $ = cheerio.load(urlRes.data);
                $('.card.content-card.animation-slide-up').each((index, el) => {
                    const placeName = $(el).find('.card-heading').text().split('.');
                    let placeNameFinal = "";
                    var i;
                    for (i = 1; i < placeName.length; i++) {
                        placeNameFinal += placeName[i];
                    }

                    const distance = $(el).find('p.objective').text().match(/[0-9]+ km/);

                    const placeDetails = $(el).find('.card-text').text();

                    const readMoreLink = $(el).find('.btn.btn-read-more.mr-auto').attr('onclick');

                    const photo = $(el).find('.card-img-top.lazy').attr('data-original');

                    let placeMap = {
                        'index': index + 1,
                        'attractionName': placeNameFinal.trim(),
                        'distance': distance + ' from city center',
                        'description': placeDetails.trim(),
                        'readMore': readMoreLink.substring(10, readMoreLink.length - 2),
                        'picture': photo.trim()
                    }
                    placesList.push(placeMap);
                });
                res.send({ 'totalCount': placesList.length, 'cityName': queryCityName, 'places': placesList });
            }).catch(err => {
                res.status(400).send({ 'errorMessage': err });
            });
    }
});

app.get('/hotels/:id', (req, res) => {
    res.setHeader('Content-type', 'application/json');
    let queryCityName = req.params.id;
    if (queryCityName == null) {
        res.send({ 'errorMessage': 'Pass a city to query results e.g., /attractions/delhi.' })
    } else {
        var url = 'https://www.holidify.com/places/' + queryCityName + '/hotels-where-to-stay.html';
        axios.get(url)
            .then(urlRes => {
                let hotels = [];
                const $ = cheerio.load(urlRes.data);
                $('.row.no-gutters.mb-3.hotel-card').each((index, el) => {
                    const hotelName = $(el).find('.hotel-name.mt-md-3.hotel-line-margin.noMargin').text();

                    const distance = $(el).find('.distance').text();

                    let hotelPictures = [];
                    $(el).find('.lazyBG.swipe-image.p-0.m-0').each((elementIndex, picElement) => {
                        const pic = $(picElement).attr('data-original');
                        hotelPictures.push(pic);
                    })

                    const price = $(el).find('.price').text();

                    const viewDeal = $(el).find('.btn.btn-read-more.btn-sm-hotel').attr('onclick');
                    let viewDealLink;
                    try {
                        viewDealLink = viewDeal.match(/"([^"]*)"/)[0].substring(1, viewDeal.match(/"([^"]*)"/)[0].length - 1);
                    } catch (error) {
                        viewDealLink = "";
                    }

                    let hoteMap = {
                        'index': index + 1,
                        'hotelName': hotelName,
                        'distance': distance.trim(),
                        'pictures': hotelPictures,
                        'price': price.trim(),
                        'viewDealLink': viewDealLink
                    }

                    hotels.push(hoteMap);
                });
                res.send({ 'totalCount': hotels.length, 'cityName': queryCityName, 'places': hotels });

            }).catch(err => {
                res.status(400).send({ 'errorMessage': err });
            });

    }
});



app.post('/webhook', (req, res) => {
    if (!req.body) {
        return res.sendStatus(400)
    }
    res.setHeader('Content-type', 'application/json');

    var action = req.body.queryResult.action;

    if (action == "get_weather") {
        var city_name = req.body.queryResult.parameters.from;
        console.log(city_name);
        var url = 'https://api.openweathermap.org/data/2.5/weather?q=' + city_name + '&appid=' + weatherAPIKey;
        axios
            .get(url)
            .then(result => {
                let wet = city_name + ' is a good choice! The temperature is approximately ' + KelvinToCelcius(result.data.main.temp).toString() +
                    " degree celcius over there, pack your belongings accordingly. When do you plan to start the trip?";

                let responseObject = {
                    "fulfillmentText": "",
                    "fulfillmentMessages": [{ "text": { "text": [wet] } }],
                    "source": "",
                }
                res.send(responseObject);
            })
            .catch(err => {
                throw err;
            });
    } else if (action == "get_flights") {
        var values = req.body.queryResult.outputContexts;
        var i;
        const regex = /await_landing_city$/;
        for (i = 0; i < values.length; i++) {
            var z = values[i].name;
            if (z.match(regex)) {
                var params = values[i].parameters;
                var fromCity = params["geo-city1"];
                var toCity = params.from;
                var date = params["date-time"];


                var fromCityCodeUrl = "https://www.air-port-codes.com/api/v1/multi?term=" + fromCity;
                var toCityCodeUrl = "https://www.air-port-codes.com/api/v1/multi?term=" + toCity;
                let dateList = date.split("T")[0].split("-");
                var finalDate = dateList[2] + "/" + dateList[1] + "/" + dateList[0];

                var ul = 'https://www.makemytrip.com/flights/';
                let custom_flight_response = "Here are some details:\n" + 'I guess there are not many super fast flights for your flight from ' + fromCity + ' to' + toCity + ' on date: ' + finalDate + "\nTo book comfotable and affordable flightsand look for more details here: ```" + ul + '```' +
                    ' would you like me to configure a trip for you?';
                let responseObject = {
                    "fulfillmentText": "",
                    "fulfillmentMessages": [{ "text": { "text": [custom_flight_response] } }],
                    "source": "",
                }
                res.send(responseObject);

                // axios({
                //     method: 'post',
                //     url: fromCityCodeUrl,
                //     headers: {
                //         'APC-Auth': airportCodeAPIKey,
                //         'APC-Auth-Secret': airportCodeSecret
                //     }
                // }).then(result => {
                //     if (result.data.statusCode == 200) {

                //         let plF = result.data.airports[0];
                //         var fromCityCode;
                //         if (plF.name.match(/All Airports$/)) {
                //             fromCityCode = result.data.airports[1].iata;
                //         } else {
                //             fromCityCode = result.data.airports[0].iata;
                //         }

                //         axios({
                //             method: 'post',
                //             url: toCityCodeUrl,
                //             headers: {
                //                 'APC-Auth': airportCodeAPIKey,
                //                 'APC-Auth-Secret': airportCodeSecret
                //             }
                //         }).then(result2 => {
                //             if (result2.data.statusCode == 200) {
                //                 let pl = result2.data.airports[0];
                //                 var toCityCode;
                //                 if (pl.name.match(/All Airports$/)) {
                //                     toCityCode = result2.data.airports[1].iata;
                //                 } else {
                //                     toCityCode = result2.data.airports[0].iata;
                //                 }


                //                 let flightQuery = fromCityCode + "-" + toCityCode + "-" + finalDate;
                //                 let mmtFlightUrl = "https://www.makemytrip.com/flight/search?itinerary=" + flightQuery + "&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E"
                //                 let dl = date.split("T")[0].split("-");
                //                 let d = dl[0] + '/' + dl[1] + '/' + dl[2]

                //                 let flightSchedulesApi = "https://api.flightstats.com/flex/schedules/rest/v1/json/from/" + fromCityCode + "/to/" + toCityCode + "/arriving/" + d + "?appId=0762d25d&appKey=7662340eba0c099522f827941ed712ac";


                //                 let custom_flight_response = "Here are some details:\n" + 'I guess there are not many super fast flights for your query on date: ' + d + "\nTo book comfotable and affordable flightsand look for more details here: ```" + mmtFlightUrl + '```' +
                //                     ' would you like me to configure a trip for you?';

                //                 let responseObject = {
                //                     "fulfillmentText": "",
                //                     "fulfillmentMessages": [{ "text": { "text": [custom_flight_response] } }],
                //                     "source": "",
                //                 }
                //                 res.send(responseObject);
                //             }
                //         }).catch((err) => {
                //             var ul = 'https://www.makemytrip.com/flights/';
                //             let custom_flight_response = "Here are some details:\n" + 'I guess there are not many super fast flights for your query on date: ' + d + "\nTo book comfotable and affordable flightsand look for more details here: ```" + ul + '```' +
                //                 ' would you like me to configure a trip for you?';
                //             let responseObject = {
                //                 "fulfillmentText": "",
                //                 "fulfillmentMessages": [{ "text": { "text": [custom_flight_response] } }],
                //                 "source": "",
                //             }
                //             res.send(responseObject);
                //         });
                //     }
                // }).catch((er) => {

                // });
            }
        }
    } else if (action == "final_response") {
        var values = req.body.queryResult.outputContexts;
        const regex = /await_date_of_travel$/;
        var i;
        for (i = 0; i < values.length; i++) {
            var z = values[i].name;
            if (z.match(regex)) {
                var params = values[i].parameters;
                var toCity = params.from;
                var date = params["date-time"];
                let dateList = date.split("T")[0].split("-");
                var finalDate = dateList[2] + "/" + dateList[1] + "/" + dateList[0];

                var placesUrl = 'https://www.holidify.com/places/' + toCity + '/sightseeing-and-things-to-do.html';
                var hotelsUrl = 'https://www.holidify.com/places/' + toCity + '/hotels-where-to-stay.html';
                var linkToPlans = 'https://www.holidify.com/places/' + toCity + '/packages.html';
                var linkToActivities = 'https://www.holidify.com/places/' + toCity + '/tours.html';

                axios.get(placesUrl)
                    .then(urlRes => {
                        let placesList = [];
                        const $ = cheerio.load(urlRes.data);
                        const all_divs = $('.card.content-card.animation-slide-up');
                        var q;
                        try {
                            for (q = 0; q < 3; q++) {
                                const el = $(all_divs[q]);
                                const placeName = el.find('.card-heading').text().split('.');
                                let placeNameFinal = "";
                                var i;
                                for (i = 1; i < placeName.length; i++) {
                                    placeNameFinal += placeName[i];
                                }
                                const distance = el.find('p.objective').text().match(/[0-9]+ km/);
                                const placeDetails = el.find('.card-text').text();
                                const readMoreLink = el.find('.btn.btn-read-more.mr-auto').attr('onclick');
                                const photo = el.find('.card-img-top.lazy').attr('data-original');
                                let placeMap = {
                                    'index': q + 1,
                                    'attractionName': placeNameFinal.trim(),
                                    'distance': distance + ' from city center',
                                    'description': placeDetails.trim(),
                                    'readMore': readMoreLink.substring(10, readMoreLink.length - 2),
                                    'picture': photo.trim()
                                }
                                placesList.push(placeMap);

                            }
                        } catch (err) {
                            console.log(err);

                        }
                        let finalPlacesJSON = { 'totalCount': q, 'cityName': toCity, 'places': placesList };

                        var message = 'This is what I\'ve configured for your trip to ' + toCity + ' on ' + finalDate + ' :' +
                            '\nPlaces to visit:\n ~~~' + JSON.stringify(finalPlacesJSON) + '~~~' +
                            '\nMore places to visit: ```' + placesUrl + '```' +
                            '\nBrowse some good hotel links as well: ```' + hotelsUrl + '```' +
                            '\nYou can also browse custom travel packages from our partners here: ```' + linkToPlans + '```' +
                            '\nFuthermore suggested activities can be found here: ```' + linkToActivities + '```' +
                            '\nAlso I\'ll keep you updated with good restaraunts as you travel.';

                        console.log(message);

                        let responseObject = {
                            "fulfillmentText": "",
                            "fulfillmentMessages": [{ "text": { "text": [message] } }],
                            "source": "",
                        }
                        res.send(responseObject);


                    }).catch(err => {
                        let responseObject = {
                            "fulfillmentText": "",
                            "fulfillmentMessages": [{ "text": { "text": [{ 'errorMessage': err }] } }],
                            "source": "",
                        }
                        res.send(responseObject);
                    });
            }
        }
    }
});


function KelvinToCelcius(kelvin) {
    let celcius = (parseFloat(kelvin) - 273.15).toFixed(2);
    return celcius;
}


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log("Server is running"))