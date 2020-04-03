// initialize select field material 
$('select').material_select();
$(".button-collapse").sideNav();

$('.tap-target').tapTarget('open');
$('.tap-target').tapTarget('close');

// map view 
var map = L.map('map').setView([-1.2544011203660779, 36.74446105957031], 12);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiZ3JhY2VhbW9uZGkiLCJhIjoiY2poampha2g1MDQ5czNkcXplMzMycGJtYyJ9.uec448K2BkM1FADfN4YA9Q'
}).addTo(map);

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

// sigma range value
var sigmaRange = document.getElementById("test9")
// listen to changes in sigma2 value  
sigmaRange.addEventListener("change", function (event) {
    console.log(event.target.value)
})

// upload geojson file and display on map  FORM SECTION 1
function uploadTrainingData(event) {
    fileRead(event)
};

// use of javascript file reader to access geojson file 
function fileRead() {
    var input = event.target;
    var reader = new FileReader();

    reader.onload = function () {
        var dataURL = reader.result;
        var trainingGeojson = JSON.parse(dataURL)
        var trainingLayer = L.geoJSON(trainingGeojson)
        var addTrainingLayer = trainingLayer.addTo(map)
        var variableOptions = Object.keys(trainingGeojson.features[0].properties)[0]
        var variables = $('select')["0"]


        variables.innerHTML += `<option value="${variableOptions}">${variableOptions}</option>`
        console.log(variables)

        map.fitBounds(trainingLayer.getBounds());

        // console.log(reader.result)
        return reader.result
    };
    reader.readAsText(input.files[0]);
    // return reader

}
// train uploaded geojson file generate variogram FORM SECTION 2 
function trainDataForm(event) {
    event.preventDefault()

    var input = document.getElementById("train_data")
    // var input = event.target;
    var reader = new FileReader();
    reader.readAsText(input.files[0]);

    reader.onload = function () {

        var dataURL = reader.result;
        var trainingGeojson = JSON.parse(dataURL)
        return fileLoaded(trainingGeojson)
    }
}
// execute during reader.onload 
var fileLoaded = function (trainingGeojson) {

    // get form input data 
    var userInput = $("#trainForm").serializeArray()
    // var variable = userInput[0].value
    var model = userInput[1].value
    var sigma2 = userInput[2].value
    var alpha = userInput[3].value
    var t = []
    var x = []
    var y = []

    for (var i = 0; i < trainingGeojson.features.length; i++) {
        var copper = trainingGeojson.features[i].properties.copper
        var X = trainingGeojson.features[i].geometry.coordinates[1]
        var Y = trainingGeojson.features[i].geometry.coordinates[0]

        t.push(copper)
        x.push(X)
        y.push(Y)
    }
    var trained = train(t, x, y, model, sigma2, alpha)
    console.log(trained)
    return train(t, x, y, model, sigma2, alpha)
}

// predict test data using variogram from train data 
function predictData(event) {
    event.preventDefault()
    var reader = new FileReader();
    var input = document.getElementById("train_data")
    var testInput = document.getElementById("test_data")
    reader.onload = function () {
        var dataURL = reader.result;
        var trainingGeojson = JSON.parse(dataURL)
        var variogram = fileLoaded(trainingGeojson)
        // console.log(variogram)

        var predictedVal = []

        for (var i = 0; i < variogram.n; i++) {
            var xnew = trainingGeojson.features[i].geometry[1]
            var ynew = trainingGeojson.features[i].geometry[0]
            var tpredicted = predict(xnew[i], ynew[i], variogram);
            predictedVal.push(tpredicted)

            // console.log(tpredicted)
        }
        console.log(predictedVal)
    };
    reader.readAsText(input.files[0]);
}
function uploadTestData(event) {
    var input = event.target;
    var reader = new FileReader();

    reader.onload = function () {
        var dataURL = reader.result;
        var trainingGeojson = JSON.parse(dataURL)
        var trainingLayer = L.geoJSON(trainingGeojson)
        var addTrainingLayer = trainingLayer.addTo(map)
        var variableOptions = Object.keys(trainingGeojson.features[0].properties)[0]

        map.fitBounds(trainingLayer.getBounds());

        // console.log(reader.result)
        return reader.result
    };
    reader.readAsText(input.files[0]);
}

// download predicted data 
function saveToFile(content, filename) {
    var file = filename + '.geojson';
    saveAs(new File([JSON.stringify(content)], file, {
        type: "text/plain;charset=utf-8"
    }), file);
}
// return saveToFile(addTrainingLayer.toGeoJSON(), 'predicted');


// for(var i=0;i<variogram.n;i++){
//     L.marker([variogram.x[i],variogram.y[i]]).addTo(map);
// }

// function displayPoints() {
//     var predPoints = []
//     for (var i = 0; i < variogram.n; i++) {
//         var data = {
//             'type': 'Feature',
//             'geometry': {
//                 'type': 'Point',
//                 'coordinates': [variogram.y[i], variogram.x[i]]
//             }
//         }


//         predPoints.push(data)
//     }

//     return predPoints

// }
// var geojsonD = {
//     'type': 'FeatureCollection',
//     'features': displayPoints()
// }

// map.on('change', function () {
//     console.log("changed")
// })



// $(document).ready(function () {

// });
