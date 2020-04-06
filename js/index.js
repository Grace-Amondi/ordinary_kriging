$(".button-collapse").sideNav();
$('.tap-target').tapTarget('open');
$('.tap-target').tapTarget('close');
var varOption = document.getElementById("variables")

// map view 
// var map = L.map('map').setView([-1.2544011203660779, 36.74446105957031], 12);
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JhY2VhbW9uZGkiLCJhIjoiY2poampha2g1MDQ5czNkcXplMzMycGJtYyJ9.uec448K2BkM1FADfN4YA9Q';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/graceamondi/ck8ozxtnl0bjl1ipeqzib7nvj',
    center: [36.74446105957031, -1.2544011203660779],
    zoom: 9
});
// L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
//     attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
//     maxZoom: 18,
//     id: 'mapbox/streets-v11',
//     tileSize: 512,
//     zoomOffset: -1,
//     accessToken: 'pk.eyJ1IjoiZ3JhY2VhbW9uZGkiLCJhIjoiY2poampha2g1MDQ5czNkcXplMzMycGJtYyJ9.uec448K2BkM1FADfN4YA9Q'
// }).addTo(map);


// train incoming data 
function train(t, x, y, model, sigma2, alpha) {

    var variogram = kriging.train(t, x, y, model, sigma2, alpha);

    return variogram
}

// predict variables for new coordinates 
function predict(x, y, variogram) {
    var i, k = Array(variogram.n);
    for (i = 0; i < variogram.n; i++) {
        k[i] = variogram.model(Math.pow(Math.pow(x - variogram.x[i], 2) +
            Math.pow(y - variogram.y[i], 2), 0.5),
            variogram.nugget, variogram.range,
            variogram.sill, variogram.A);
    }

    return kriging_matrix_multiply(k, variogram.M, 1, variogram.n, 1)[0];
};

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
                    }
                    else {
                        toastr.options = {
                            "closeButton": true,
                            "timeOut": 7000,
                            "positionClass": "toast-bottom-right",
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
                    map.addSource(`hello${i}`, {
                        type: 'geojson',
                        data: fileData[0]
                    });
                    map.addLayer({
                        'id': 'train',
                        'type': 'circle',
                        'source': `hello${i}`,
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
                    // map.fitBounds(fileData[0].extent)
                    // trainingLayer.addTo(map);
                    // fit points to map 
                    // map.fitBounds(trainingLayer.getBounds());
                    new ordinaryKriging().performComputation(fileData);
                };

                reader.readAsText(input.files[i]);
            }

        };
        this.performComputation = function performComputation(fileData) {
            // var joke = new ordinaryKriging()
            // joke.uploadData()
            console.log("hello");
            if (fileData.length === 2) {
                var userInput = $("#trainForm").serializeArray();
                console.log(userInput);
                // generate variogram 
                var model = userInput[1].value;
                var sigma2 = userInput[2].value;
                var alpha = userInput[3].value;
                var t = [];
                var x = [];
                var y = [];
                var selectedVariable = varOption.options[varOption.selectedIndex].value;
                for (var i = 0; i < fileData[0].features.length; i++) {
                    var copper = fileData[0].features[i].properties[`${selectedVariable}`];
                    var X = fileData[0].features[i].geometry.coordinates[1];
                    var Y = fileData[0].features[i].geometry.coordinates[0];
                    t.push(copper);
                    x.push(X);
                    y.push(Y);
                }
                var trained = train(t, x, y, model, sigma2, alpha);
                // predict new data 
                var predictedVal = [];
                for (var i = 0; i < trained.n; i++) {
                    var xnew = fileData[1].features[i].geometry.coordinates[1];
                    var ynew = fileData[1].features[i].geometry.coordinates[0];
                    var tpredicted = predict(xnew, ynew, trained);
                    predictedVal.push(tpredicted);
                }
                console.log(predictedVal);
                // return train(t, x, y, model, sigma2, alpha)
            }
        };
    }
}
var ord = new ordinaryKriging()
var dataInput = document.getElementById("train_data")
dataInput.addEventListener("change", ord.uploadData, false)
function handleForm(event) { event.preventDefault(); }

var performComputationForm = document.getElementById("uploadtrainForm")
performComputationForm.addEventListener("submit", function () {
    // handleForm
    ord.performComputation
}, false)
performComputationForm.addEventListener('submit', handleForm);

map.on("change", function () {
    console.log(map.getLayer('train'))
})

