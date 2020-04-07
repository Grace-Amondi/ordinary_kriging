$(".button-collapse").sideNav();
$('.tap-target').tapTarget('open');
$('.tap-target').tapTarget('close');
var varOption = document.getElementById("variables")
var predictForm = document.getElementById("predictForm")
var performComputationForm = document.getElementById("trainForm")
window.onload = setTimeout(function () { $('.tap-target').tapTarget('open') }, 5000)
window.onload = setTimeout(function () { $('.tap-target').tapTarget('close') }, 10000)
var info = document.getElementById("info")
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JhY2VhbW9uZGkiLCJhIjoiY2poampha2g1MDQ5czNkcXplMzMycGJtYyJ9.uec448K2BkM1FADfN4YA9Q';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/graceamondi/ck8ozxtnl0bjl1ipeqzib7nvj',
    center: [36.74446105957031, -1.2544011203660779],
    zoom: 9
});
var kriging = {};
// Train using gaussian processes with bayesian priors
kriging.train = function (t, x, y, model, sigma2, alpha) {
    var variogram = {
        t: t,
        x: x,
        y: y,
        nugget: 0.0,
        range: 0.0,
        sill: 0.0,
        A: 1 / 3,
        n: 0
    };
    switch (model) {
        case "gaussian":
            variogram.model = kriging_variogram_gaussian;
            break;
        case "exponential":
            variogram.model = kriging_variogram_exponential;
            break;
        case "spherical":
            variogram.model = kriging_variogram_spherical;
            break;
    };

    // Lag distance/semivariance
    var i, j, k, l, n = t.length;
    var distance = Array((n * n - n) / 2);
    for (i = 0, k = 0; i < n; i++)
        for (j = 0; j < i; j++, k++) {
            distance[k] = Array(2);
            distance[k][0] = Math.pow(
                Math.pow(x[i] - x[j], 2) +
                Math.pow(y[i] - y[j], 2), 0.5);
            distance[k][1] = Math.abs(t[i] - t[j]);
        }
    distance.sort(function (a, b) { return a[0] - b[0]; });
    variogram.range = distance[(n * n - n) / 2 - 1][0];

    // Bin lag distance
    var lags = ((n * n - n) / 2) > 30 ? 30 : (n * n - n) / 2;
    var tolerance = variogram.range / lags;
    var lag = [0].rep(lags);
    var semi = [0].rep(lags);
    if (lags < 30) {
        for (l = 0; l < lags; l++) {
            lag[l] = distance[l][0];
            semi[l] = distance[l][1];
        }
    }
    else {
        for (i = 0, j = 0, k = 0, l = 0; i < lags && j < ((n * n - n) / 2); i++, k = 0) {
            while (distance[j][0] <= ((i + 1) * tolerance)) {
                lag[l] += distance[j][0];
                semi[l] += distance[j][1];
                j++; k++;
                if (j >= ((n * n - n) / 2)) break;
            }
            if (k > 0) {
                lag[l] /= k;
                semi[l] /= k;
                l++;
            }
        }
        if (l < 2) return variogram; // Error: Not enough points
    }

    // Feature transformation
    n = l;
    variogram.range = lag[n - 1] - lag[0];
    var X = [1].rep(2 * n);
    var Y = Array(n);
    var A = variogram.A;
    for (i = 0; i < n; i++) {
        switch (model) {
            case "gaussian":
                X[i * 2 + 1] = 1.0 - Math.exp(-(1.0 / A) * Math.pow(lag[i] / variogram.range, 2));
                break;
            case "exponential":
                X[i * 2 + 1] = 1.0 - Math.exp(-(1.0 / A) * lag[i] / variogram.range);
                break;
            case "spherical":
                X[i * 2 + 1] = 1.5 * (lag[i] / variogram.range) -
                    0.5 * Math.pow(lag[i] / variogram.range, 3);
                break;
        };
        Y[i] = semi[i];
    }

    // Least squares
    var Xt = kriging_matrix_transpose(X, n, 2);
    var Z = kriging_matrix_multiply(Xt, X, 2, n, 2);
    Z = kriging_matrix_add(Z, kriging_matrix_diag(1 / alpha, 2), 2, 2);
    var cloneZ = Z.slice(0);
    if (kriging_matrix_chol(Z, 2))
        kriging_matrix_chol2inv(Z, 2);
    else {
        kriging_matrix_solve(cloneZ, 2);
        Z = cloneZ;
    }
    var W = kriging_matrix_multiply(kriging_matrix_multiply(Z, Xt, 2, 2, n), Y, 2, n, 1);

    // Variogram parameters
    variogram.nugget = W[0];
    variogram.sill = W[1] * variogram.range + variogram.nugget;
    variogram.n = x.length;

    // Gram matrix with prior
    n = x.length;
    var K = Array(n * n);
    for (i = 0; i < n; i++) {
        for (j = 0; j < i; j++) {
            K[i * n + j] = variogram.model(Math.pow(Math.pow(x[i] - x[j], 2) +
                Math.pow(y[i] - y[j], 2), 0.5),
                variogram.nugget,
                variogram.range,
                variogram.sill,
                variogram.A);
            K[j * n + i] = K[i * n + j];
        }
        K[i * n + i] = variogram.model(0, variogram.nugget,
            variogram.range,
            variogram.sill,
            variogram.A);
    }

    // Inverse penalized Gram matrix projected to target vector
    var C = kriging_matrix_add(K, kriging_matrix_diag(sigma2, n), n, n);
    var cloneC = C.slice(0);
    if (kriging_matrix_chol(C, n))
        kriging_matrix_chol2inv(C, n);
    else {
        kriging_matrix_solve(cloneC, n);
        C = cloneC;
    }

    // Copy unprojected inverted matrix as K
    var K = C.slice(0);
    var M = kriging_matrix_multiply(C, t, n, n, 1);
    variogram.K = K;
    variogram.M = M;

    return variogram;
};

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
                        // toastr.success(`<p>Woohoo! Go ahead and train your model</p>`);
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
                    map.addSource(`train`, {
                        type: 'geojson',
                        data: fileData[0]
                    });
                    map.addLayer({
                        'id': 'point',
                        'type': 'circle',
                        'source': `train`,
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
                                    var tpredicted = predict(xnew, ynew, trained);
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
                                // toastr.success(`<p>Good Job. Download your predictions.</p>`);
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

