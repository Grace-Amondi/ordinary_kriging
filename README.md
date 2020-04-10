# Ordinary Kriging

## Introduction

![Application](https://github.com/Grace-Amondi/ordinary_kriging/blob/master/images/home.png "Application Demo")

Geostatistical Prediction with ordinary kriging 
Ordinary Kriging is a spatial estimation method where the error variance is minimized. 
This error variance is called the kriging variance. It is based on the configuration of the data and on the variogram. For example, say we are studying copper concentration in soil,
your training data is point data with attribute information..say copper concentration at each point.The test data contains just point data...without copper concentration.The train data is used
to create a variogram which predicts the copper concentration for the test data. Try [Demo](http://ordinary-kriging.surge.sh "demo application") or view demo on [youtube](https://www.youtube.com/watch?v=Y1Md18hFwwg "youtube demo").

According to [sakitam-gis](https://sakitam-gis.github.io/kriging.js/examples/world.html "kriging docs"),the various variogram models can be interpreted as kernel functions for 2-dimensional coordinates a, b and parameters nugget, range, sill and A. Reparameterized as a linear function, with w = [nugget, (sill-nugget)/range], this becomes:

- Gaussian: k(a,b) = w[0] + w[1] * ( 1 - exp{ -( ||a-b|| / range )2 / A } )
- Exponential: k(a,b) = w[0] + w[1] * ( 1 - exp{ -( ||a-b|| / range ) / A } )
- Spherical: k(a,b) = w[0] + w[1] * ( 1.5 * ( ||a-b|| / range ) - 0.5 * ( ||a-b|| / range )3 )

The variance parameter α of the prior distribution for w should be manually set, according to:

- w ~ N(w|0, αI)

Using the fitted kernel function hyperparameters and setting K as the Gram matrix, the prior and likelihood for the gaussian process become:

- y ~ N(y|0, K)
- t|y ~ N(t|y, σ2I)

---

## Run application

Clone application

```git clone https://github.com/Grace-Amondi/ordinary_kriging.git```

Move into the ordinary_kriging directory

```cd ordinary_kriging```

Change .env.example to .env and Set your *mapbox access token*.Install node modules

```npm install```

Run application

```npm start```

Open application at http://localhost:1234

---

## Build for production

To build the app for production,

```npm run build```

Navigate to /dist folder and deploy to [surge](https://surge.sh/ "surge") or [github pages](https://pages.github.com/ "github pages")

---

## Resources Used 

### Mapbox GL

[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/ "Mapbox GL JS") is a JavaScript library used to render interactive maps. This application uses Mapbox GL to create a map object,
display geojson data, create layers from the datasets and create layer groups from the layers.

### Turf JS

[Turf JS](https://turfjs.org/ "Turf JS") provides a set of submodules for advanced geospatial analysis on the browser. This application
uses turf js to create point features, append attribute data to point data and create feature collections from the point data

### Mapbox GL plugins

#### mapbox-gl-controls 
 
[mapbox-gl-controls](https://github.com/bravecow/mapbox-gl-controls "mapbox-gl-controls github") provides an array of controls that
can be added to the map to enhance interactivity. This application uses mapbox-gl-controls's RulerControl,CompassControl,ZoomControl and AroundControl
submodules.

### Javascript FileReader
[Javascript FileReader](https://developer.mozilla.org/en-US/docs/Web/API/FileReader "Javascript FileReader") enables asynchronous reading of contents of
files (or raw data buffers) stored on the user's computer, using File or Blob objects to specify the file or data to read.This was used
in reading of training and test geojson data.

### FileSaver

[FileSaver](https://github.com/eligrey/FileSaver.js/ "filesaver") enables saving files on the client-side which is exactly what it was used for in this application. With the saveAs() 
function you are good to go.

### Parcel
[Parcel](https://parceljs.org/getting_started.html "Parcel") is a web application bundler. It has been used to bundle this application
into a minified version.Parcel also converts JS assets to ES5.

### Materialize
[Materialize](https://materializecss.com/ "Materialize") has been used to design the app's beautiful user interface with mobile responsiveness,
grids and cards. 


