import RulerControl from 'mapbox-gl-controls/lib/ruler';
import CompassControl from 'mapbox-gl-controls/lib/compass';
import ZoomControl from 'mapbox-gl-controls/lib/zoom';
import AroundControl from 'mapbox-gl-controls/lib/around'
import kriging from './kriging'
var bounds = new mapboxgl.LngLatBounds();

// mobile nav bar 
$(".button-collapse").sideNav();

// page preloader 
window.onload = function () {
    $('.loader').fadeOut('slow');
    document.getElementById("page").style.visibility = 'visible'

    // welcome popup 
    setTimeout(function () { $('.tap-target').tapTarget('open') }, 5000)
    setTimeout(function () { $('.tap-target').tapTarget('close') }, 10000)
}

var varOption = document.getElementById("variables")
var performTrainingForm = document.getElementById("trainForm")
var dataInput = document.getElementById("train_data")
var downloadButton = document.getElementById("download_data")
var dataButton = document.getElementById("train_data_button")
var testButtonInput = document.getElementById("test_data")
var testButton = document.getElementById("test_data_button")
// // welcome popup 
var info = document.getElementById("info")

// map container //replace with your mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JhY2VhbW9uZGkiLCJhIjoiY2poampha2g1MDQ5czNkcXplMzMycGJtYyJ9.uec448K2BkM1FADfN4YA9Q';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/graceamondi/ck1p6wqfs0vj81cqwbikdv87j',
    center: [36.74446105957031, -1.2544011203660779],
    // zoom: 12
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

// prevent page reload on any form submit 
function handleForm(event) { event.preventDefault(); }

// handle uploading files 
function uploadBothData() {
    // upload datasets
    var input = document.getElementById("train_data");
    var reader = new FileReader();
    reader.onload = function () {
        var dataURL = reader.result;
        var trainingGeojson = JSON.parse(dataURL);

        addTrainToMap(trainingGeojson);

    };

    reader.readAsText(input.files[0]);



}

// upload both train and test data 
dataInput.addEventListener("change", uploadBothData, false)

// add train data to map 
function addTrainToMap(trainingGeojson) {
    // get variables in train data 
    var variableOptions = Object.values(trainingGeojson.features[0].properties);
    // only use numeric data types 
    if (typeof (variableOptions[0]) == 'number') {
        for (let n = 0; n < variableOptions.length; n++) {
            // initialize select field material 
            varOption.innerHTML += `<option value="${Object.keys(trainingGeojson.features[0].properties)[n]}">${Object.keys(trainingGeojson.features[0].properties)[n]}</option>`;
           
            $('select').material_select();
            
        }
        dataButton.classList.add('disabled')
        dataButton.addEventListener('mouseenter', function () {
            dataButton.style.cursor = 'not-allowed'
        })
        $('.tap-target').tapTarget('open')
        info.innerHTML = `<h5 style="font-family: 'Patrick Hand', cursive;">Woohoo! Go ahead and train your model</h5>`
        // add training geojson data to map 
        map.addSource('Train Layer', {
            type: 'geojson',
            data: trainingGeojson
        });
        map.addLayer({
            'id': 'Train Layer',
            'type': 'circle',
            'source': 'Train Layer',
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

        trainingGeojson.features.forEach(function (feature) {
            bounds.extend(feature.geometry.coordinates);
        });

        map.fitBounds(bounds, {
            padding: 20,
            linear: false
        });
        var toggleableLayerIds = 'Train Layer'

        var link = document.createElement('a');
        link.href = '#';
        link.className = 'active';
        link.innerHTML = `&#10004;`;
        link.textContent +=`${toggleableLayerIds}` ;

        link.onclick = function (e) {
            var clickedLayer = toggleableLayerIds;
            e.preventDefault();
            e.stopPropagation();

            var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

            if (visibility === 'visible') {
                map.setLayoutProperty(clickedLayer, 'visibility', 'none');
                this.className = '';
            } else {
                this.className = 'active';
                map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
            }
        };

        var layers = document.getElementById('layergroup');
        layers.appendChild(link);

        // When a click event occurs on a feature in the Train Layer layer, open a popup at the
        // location of the feature, with description HTML from its properties.
        var description = []
        map.on('click', 'Train Layer', function (e) {
            for (var m = 0; m < Object.keys(e.features[0].properties).length; m++) {
                var coordinates = e.features[0].geometry.coordinates.slice();
                description[m] = `${Object.keys(e.features[0].properties)[m]}:${Object.values(e.features[0].properties)[m]}<br>`;
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

        // Change the cursor to a pointer when the mouse is over the Train layer.
        map.on('mouseenter', 'Train Layer', function () {
            map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        map.on('mouseleave', 'Train Layer', function () {
            map.getCanvas().style.cursor = 'default';
        });

    }

    else {
        toastr.options = {
            "closeButton": false,
            "timeOut": 7000,
            "positionClass": "toast-top-right",
            "showMethod": 'slideDown',
            "hideMethod": 'slideUp',
            "closeMethod": 'slideUp',
        };
        toastr.error(`<p  style="font-family: 'Patrick Hand', cursive;">Your Trainind Dataset does not contain any numeric variable.Try Another</p>`);
        console.log("no numeric variable");
    }


    // yep you guessed right! prevent page reload on form submit :-)
    performTrainingForm.addEventListener('submit', handleForm);
    // perform training when submit button is clicked. I know TMI. lol :-) 
    performTrainingForm.addEventListener('submit',
        function () {
            performTraining(trainingGeojson)

            $('.tap-target').tapTarget('open')
            info.innerHTML = `<h5  style="font-family: 'Patrick Hand', cursive;">Yey!! Model has been trained. Let's Predict</h5>`
        }
    )
}

// Train variogram model using train data i.e fileData[0]
function performTraining(trainingGeojson) {
    var userInput = $("#trainForm").serializeArray();
    // generate variogram 
    var model = userInput[1].value;
    var sigma2 = userInput[2].value;
    var alpha = userInput[3].value;
    var t = [];
    var x = [];
    var y = [];
    var selectedVariable = varOption.options[varOption.selectedIndex].value;
    for (var i = 0; i < trainingGeojson.features.length; i++) {
        var variable = trainingGeojson.features[i].properties[`${selectedVariable}`];
        var X = trainingGeojson.features[i].geometry.coordinates[1];
        var Y = trainingGeojson.features[i].geometry.coordinates[0];
        t.push(variable);
        x.push(X);
        y.push(Y);
    }
    // train data and generate a variogram
    var variogram = train(t, x, y, model, sigma2, alpha);
    testButtonInput.addEventListener('change', handleForm);
    testButtonInput.addEventListener('change', function () {
        addTestData(variogram, selectedVariable)
        $('.tap-target').tapTarget('open')
        info.innerHTML = `<h5  style="font-family: 'Patrick Hand', cursive;">Good Job. Download your predictions.</h5>`
    })

};

function addTestData(variogram, selectedVariable) {
    var input = document.getElementById("test_data");
    var reader = new FileReader()

    reader.onload = function () {
        var dataUrl = reader.result
        var testingGeojson = JSON.parse(dataUrl);
        // Predict new data using generated variogram model 
        performPrediction(testingGeojson, variogram, selectedVariable)
        testButton.classList.add('disabled')
        testButton.addEventListener('mouseenter', function () {
            testButton.style.cursor = 'not-allowed'
        })
    }
    reader.readAsText(input.files[0]);


}
function performPrediction(testingGeojson, variogram, selectedVariable) {
    // predict new data 
    var predctions = []
    for (var i = 0; i < testingGeojson.features.length; i++) {
        var xnew = testingGeojson.features[i].geometry.coordinates[1];
        var ynew = testingGeojson.features[i].geometry.coordinates[0];
        var tpredicted = kriging.kriging.predict(xnew, ynew, variogram);
        var geom = turf.point([ynew, xnew], { predicted: tpredicted });
        predctions.push(geom)

    }
    var collection = turf.featureCollection(predctions);
    // add test data to map 
    map.addSource(`Predicted Layer`, {
        type: 'geojson',
        data: collection
    });
    map.addLayer({
        'id': 'Predicted Layer',
        'type': 'circle',
        'source': `Predicted Layer`,
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
    var toggleableLayerIds = 'Predicted Layer'

        var link = document.createElement('a');
        link.href = '#';
        link.className = 'active';
        link.innerHTML = `&#10004;`;
        link.textContent +=`${toggleableLayerIds}` ;


        link.onclick = function (e) {
            var clickedLayer = toggleableLayerIds;
            e.preventDefault();
            e.stopPropagation();

            var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

            if (visibility === 'visible') {
                map.setLayoutProperty(clickedLayer, 'visibility', 'none');
                this.className = '';
            } else {
                this.className = 'active';
                map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
            }
        };

        var layers = document.getElementById('layergroup');
        layers.appendChild(link);

    var bounds = new mapboxgl.LngLatBounds();

    testingGeojson.features.forEach(function (feature) {
        bounds.extend(feature.geometry.coordinates);
    });

    map.fitBounds(bounds, {
        padding: 20,
        linear: false
    });

    // Change the cursor to a pointer when the mouse is over the Train layer.
    map.on('mouseenter', 'Predicted Layer', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'Predicted Layer', function () {
        map.getCanvas().style.cursor = 'default';
    });

    var description = []
    map.on('click', 'Predicted Layer', function (e) {
        for (var m = 0; m < Object.keys(e.features[0].properties).length; m++) {
            var coordinates = e.features[0].geometry.coordinates.slice();
            description[m] = `${Object.keys(e.features[0].properties)[m]}:${Object.values(e.features[0].properties)[m]}<br>`;
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

    downloadButton.addEventListener('click', handleForm)
    downloadButton.addEventListener('click', function () {
        downloadPredictions(collection, `${selectedVariable}_prediction`)
    }, false)

}

// download predicted data 
function downloadPredictions(content, filename) {
    var file = filename + '.geojson';
    saveAs(new File([JSON.stringify(content)], file, {
        type: "text/plain;charset=utf-8"
    }), file);
}

