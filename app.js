// // categorical variable 
// var t = [23, 10, 7, 12, 56];

// // x , y location of variable 
// var x = [-1.2544011203660779, -1.2331201247997963, -1.301767871939471, -1.2770548931316255, -1.2317471514699085];
// var y = [36.74446105957031, 36.82823181152344, 36.72111511230469, 36.802825927734375, 36.802825927734375];

// // varigram model 
// var model = "gaussian";
// var sigma2 = 0, alpha = 10;

// // train model 
// var variogram = kriging.train(t, x, y, model, sigma2, alpha);
// var xnew = [-1.2544011203660779, -1.2331201247997963, -1.301767871939471, -1.2770548931316255, -1.2317471514699085]
// var ynew = [36.74446105957031, 36.82823181152344, 36.72111511230469, 36.802825927734375, 36.802825927734375];

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
$('select').material_select();

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
$(".button-collapse").sideNav();

$('.tap-target').tapTarget('open');
$('.tap-target').tapTarget('close');

var sigmaRange = document.getElementById("test9")




function trainDataForm(event) {
    event.preventDefault()

    // console.log(uploadTrainingData())
    var input = document.getElementById("train_data")
    // var input = event.target;
    var reader = new FileReader();
    reader.readAsText(input.files[0]);
    reader.onload = fileLoaded



}

var fileLoaded = function (event) {

    var userInput = $(".trainForm").serializeArray()
    // var variable = userInput[0].value
    var model = userInput[1].value
    var sigma2 = userInput[2].value
    var alpha = userInput[3].value
    var dataURL = event.target.result;
    var trainingGeojson = JSON.parse(dataURL)
    var t = []
    var x = []
    var y = []

    console.log(Object.keys(trainingGeojson.features[0].properties)[0])


    for (var i = 0; i < trainingGeojson.features.length; i++) {
        var copper = trainingGeojson.features[i].properties.copper
        var X = trainingGeojson.features[i].geometry.coordinates[1]
        var Y = trainingGeojson.features[i].geometry.coordinates[0]

        t.push(copper)
        x.push(X)
        y.push(Y)
    }


    var variogram = kriging.train(t, x, y, model, sigma2, alpha);
    console.log(variogram)

    return dataURL
    // train model 
    // console.log(dataURL)
}


fileLoaded(onload, function () {
    console.log(variogram)
})

sigmaRange.addEventListener("change", function (event) {
    console.log(event.target.value)
})


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
        console.log($('select')["0"].innerHTML)


        variables.innerHTML += `<option value="${variableOptions}">${variableOptions}</option>`
        console.log(variables)

        map.fitBounds(trainingLayer.getBounds());

        // console.log(reader.result)
        return reader.result
    };
    reader.readAsText(input.files[0]);
    // return reader

}

function uploadTrainingData(event) {
    fileRead(event)

};
function predictData(event) {
    console.log(trainDataForm(event))
    uploadTestData(event)
    // // var xnew, ynew /* Pair of new coordinates to predict */;
    // var predictedVal = []
    // for (var i = 0; i < variogram.n; i++) {
    //     var tpredicted = predict(xnew[i], ynew[i], variogram);
    //     predictedVal.push(tpredicted)
    // }
    // console.log(predictedVal)
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



        console.log(variables)

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
