import RulerControl from 'mapbox-gl-controls/lib/ruler';
import CompassControl from 'mapbox-gl-controls/lib/compass';
import ZoomControl from 'mapbox-gl-controls/lib/zoom';
import AroundControl from 'mapbox-gl-controls/lib/around'
import kriging from './kriging'
import fs from 'fs'
// var kriging = require("./kriging")
$(".button-collapse").sideNav();

var varOption = document.getElementById("variables")
var predictForm = document.getElementById("predictForm")
var performComputationForm = document.getElementById("trainForm")
window.onload = setTimeout(function () { $('.tap-target').tapTarget('open') }, 5000)
window.onload = setTimeout(function () { $('.tap-target').tapTarget('close') }, 10000)
var info = document.getElementById("info")

// map container 
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JhY2VhbW9uZGkiLCJhIjoiY2poampha2g1MDQ5czNkcXplMzMycGJtYyJ9.uec448K2BkM1FADfN4YA9Q';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/graceamondi/ck8ozxtnl0bjl1ipeqzib7nvj',
    center: [36.74446105957031, -1.2544011203660779],
    zoom: 9
});

// map controls 
map.addControl(new ZoomControl(), 'top-left');
map.addControl(new RulerControl(), 'top-left');
map.addControl(new AroundControl(), 'top-left')
map.addControl(new CompassControl(), 'top-left');

// train incoming data 
function train(t, x, y, model, sigma2, alpha) {

    var variogram = kriging.kriging.train(t, x, y, model, sigma2, alpha);

    return variogram
}

function handleForm(event) { event.preventDefault(); }

class ordinaryKriging {
    constructor() {
        this.uploadData = function uploadData() {
            // upload datasets
            var input = document.getElementById("train_data");
            // var input = event.target;
            var fileData = [];
            for (var i = 0; i < input.files.length; i++) {
                var reader = new FileReader();
                reader.onload = function () {
                    var dataURL = event.target.result;
                    var trainingGeojson = JSON.parse(dataURL);
                    processFile(trainingGeojson);
                    fileData.push(trainingGeojson);
                    var variableOptions = Object.values(fileData[0].features[0].properties);
                    console.log(variableOptions.length);
                    if (typeof (variableOptions[0]) == 'number') {
                        for (let n = 0; n < variableOptions.length; n++) {
                            // initialize select field material 
                            console.log(Object.keys(fileData[0].features[0].properties)[n]);
                            varOption.innerHTML += `<option value="${Object.keys(fileData[0].features[0].properties)[n]}">${Object.keys(fileData[0].features[0].properties)[n]}</option>`;
                            $('select').material_select();
                        }

                        $('.tap-target').tapTarget('open')
                        info.innerHTML = `<h5>Woohoo! Go ahead and train your model</h5>`
                    }
                    else {
                        toastr.options = {
                            "closeButton": true,
                            "timeOut": 7000,
                            "positionClass": "toast-top-right",
                            "showMethod": 'slideDown',
                            "hideMethod": 'slideUp',
                            "closeMethod": 'slideUp',
                        };
                        toastr.error(`<p>Your Trainind Dataset does not contain any numeric variable</p>`);
                        console.log("no numeric variable");
                    }
                    var bbox = turf.bbox(fileData[0]);

                    // add train data to map 
                    // var trainingLayer = L.geoJSON(fileData[0]);
                    map.addSource('places', {
                        type: 'geojson',
                        data: fileData[0]
                    });
                    map.addLayer({
                        'id': 'places',
                        'type': 'circle',
                        'source': 'places',
                        'paint': {
                            // make circles larger as the user zooms from z12 to z22
                            'circle-radius': 9.75,
                            // color circles by ethnicity, using a match expression
                            // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-match
                            'circle-color': 'orange',
                            'circle-stroke-color': 'white',
                            'circle-stroke-width': 2
                        }
                    });
                    map.fitBounds(bbox)
                    var llb = new mapboxgl.LngLatBounds([bbox[0], bbox[1]], [bbox[2], bbox[3]]);
                    console.log(llb.getCenter())
                    map.easeTo({
                        center: llb.getCenter(),
                        zoom: 11,
                        speed: 0.2,
                        curve: 1,

                    });
                    // When a click event occurs on a feature in the places layer, open a popup at the
                    // location of the feature, with description HTML from its properties.
                    var description = []
                    map.on('click', 'places', function (e) {
                        for (var m = 0; m < Object.keys(e.features[0].properties).length; m++) {
                            var coordinates = e.features[0].geometry.coordinates.slice();
                            description[m] = `${Object.keys(e.features[0].properties)[m]}:${Object.values(e.features[0].properties)[m]}`;
                            console.log(description)

                            // Ensure that if the map is zoomed out such that multiple
                            // copies of the feature are visible, the popup appears
                            // over the copy being pointed to.
                            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                            }

                        }

                        new mapboxgl.Popup()
                            .setLngLat(coordinates)
                            .setHTML(description)
                            .addTo(map);

                    });

                    // Change the cursor to a pointer when the mouse is over the places layer.
                    map.on('mouseenter', 'places', function () {
                        map.getCanvas().style.cursor = 'pointer';
                    });

                    // Change it back to a pointer when it leaves.
                    map.on('mouseleave', 'places', function () {
                        map.getCanvas().style.cursor = '';
                    });

                    // map.fitBounds(fileData[0].extent)
                    // trainingLayer.addTo(map);
                    // fit points to map 
                    // map.fitBounds(trainingLayer.getBounds());
                    function performComputation(fileData) {

                        // var joke = new ordinaryKriging()
                        // joke.uploadData()
                        console.log("hello");
                        var userInput = $("#trainForm").serializeArray();
                        console.log(userInput);
                        if (fileData.length === 2) {

                            // generate variogram 
                            var model = userInput[1].value;
                            var sigma2 = userInput[2].value;
                            var alpha = userInput[3].value;
                            var t = [];
                            var x = [];
                            var y = [];
                            var selectedVariable = varOption.options[varOption.selectedIndex].value;
                            for (var i = 0; i < fileData[0].features.length; i++) {
                                var variable = fileData[0].features[i].properties[`${selectedVariable}`];
                                var X = fileData[0].features[i].geometry.coordinates[1];
                                var Y = fileData[0].features[i].geometry.coordinates[0];
                                t.push(variable);
                                x.push(X);
                                y.push(Y);
                            }
                            var trained = train(t, x, y, model, sigma2, alpha);
                            console.log(trained)
                            function predictData(trained) {
                                // predict new data 
                                var predictedVal = [];
                                for (var i = 0; i < trained.n; i++) {
                                    var xnew = fileData[1].features[i].geometry.coordinates[1];
                                    var ynew = fileData[1].features[i].geometry.coordinates[0];
                                    var tpredicted = kriging.kriging.predict(xnew, ynew, trained);
                                    predictedVal.push(tpredicted);
                                }

                                var bbox = turf.bbox(fileData[1]);

                                // add train data to map 
                                // var trainingLayer = L.geoJSON(fileData[0]);
                                map.addSource(`predict${i}`, {
                                    type: 'geojson',
                                    data: fileData[1]
                                });
                                map.addLayer({
                                    'id': 'predict',
                                    'type': 'circle',
                                    'source': `predict${i}`,
                                    'paint': {
                                        // make circles larger as the user zooms from z12 to z22
                                        'circle-radius': 9.75,
                                        // color circles by ethnicity, using a match expression
                                        // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-match
                                        'circle-color': 'grey',
                                        'circle-stroke-color': 'white',
                                        'circle-stroke-width': 2
                                    }
                                });
                                map.fitBounds(bbox)
                                var llb = new mapboxgl.LngLatBounds([bbox[0], bbox[1]], [bbox[2], bbox[3]]);
                                console.log(llb.getCenter())
                                map.easeTo({
                                    center: llb.getCenter(),
                                    zoom: 11,
                                    speed: 0.2,
                                    curve: 1,

                                });
                                console.log(predictedVal);

                            }
                            predictForm.addEventListener('submit', handleForm);
                            predictForm.addEventListener('submit', function () {
                                predictData(trained)

                                $('.tap-target').tapTarget('open')
                                info.innerHTML = `<h5>Good Job. Download your predictions.</h5>`
                            })
                        }
                    };
                    performComputationForm.addEventListener('submit', handleForm);
                    performComputationForm.addEventListener('submit',
                        function () {
                            performComputation(fileData)
                            // toastr.options = {
                            //     "closeButton": false,
                            //     "debug": false,
                            //     "newestOnTop": false,
                            //     "progressBar": false,
                            //     "positionClass": "toast-top-right",
                            //     "preventDuplicates": false,
                            //     "onclick": null,
                            //     "timeOut": "10000",
                            //     "extendedTimeOut": "1000",
                            //     "showEasing": "swing",
                            //     "hideEasing": "linear",
                            //     "showMethod": "fadeIn",
                            //     "hideMethod": "fadeOut"
                            // };
                            // toastr.success(`<p>Yey!! Model has been trained. Let's Predict</p>`);
                            $('.tap-target').tapTarget('open')
                            info.innerHTML = `<h5>Yey!! Model has been trained. Let's Predict</h5>`
                        }
                    )


                };

                reader.readAsText(input.files[i]);
            }

        };

    }
}
var ord = new ordinaryKriging()
var dataInput = document.getElementById("train_data")
dataInput.addEventListener("change", ord.uploadData, false)
function processFile(content) {
    console.log(content);
}
