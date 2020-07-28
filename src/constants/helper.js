// IMPORT
// import * as EXIF from './exif'
import EXIF from 'exif-js'
import * as faceapi from 'face-api.js';

// CONSTANTS
const inputSize = 256
const scoreThreshold = 0.5
const fmcImageErrors = {
    no_face: "Sorry, we could not detect your face. Please try again.",
    multi_face: "Unfortunately, this isn't a group activity--you need to take the photo alone. Please try again.",
    general: "Please pardon the interruption of your experience, but our application has encountered an error. Our developers are hard at work to prevent this happening again. Please try again."
}

// INITIALIZE
export let stopVideo = false;
let resultsCounter = 0;
let fmcDehydrImgUrl = "";
let fmcDarkCircImgUrl = "";
let fmcRednessImgUrl = "";
let fmcChatStatus = "offline";
let curImgData;
let fmcImageOrientation;
let faceAIsawFace = false;
let calcDehydrScore = 2;
let calcDarkCircleScore = 2;
let ovalInterval;
let imageSent = false;
var fmc_runStream = true;
let camFaceDirection = true;
let mediaStream;
let initalCaptureDelay = 0;
let fmc_showNavbar;
let fmcManualCaptureFlag = false;
let lastOnPlayCallTimeout;
let lastCallTimeoutTimer = 5000;
let lastEyePosition = { _x: 0, _y: 0 };
let onPlayDelayTimeout;
let fmcIsOnboardingScreen = false;
let mobileWidth = 768;
let counter = 0;
let fmcOS = "not found";
let fmc_results_available = false;
let fmcProductConcernsDone = false;
let fmcProductCarouselDone = false;
let pendingUpdateResultsCounter = 0;
let fmcMaxConcerns = 20;
let carouselSliderAllowsMoving = true;
let fmcRegimeLabelsOrder = ["precleanse", "cleanse", "exfoliate", "tone", "moisturize", "protect"];
var fmcImSz = {
    w: 0,
    h: 0
}
var fmcSeverityWords = {
    critical: "critical",
    moderate: "moderate"
}
var fmcMoreLessButtonsText = {
    more: "more",
    less: "less"
}
var fmcRegimeLabels = {
    precleanse: "precldfsfeanse",
    cleanse: "cleanse",
    exfoliate: "exfoliate",
    soothe: "soothe",
    tone: "tone",
    moisturize: "moisturize",
    protect: "protect"
}
var fmcProductCards = {
    shop_button: "shop"
}
var fmcConcernCopy = {
    acne: {
        title: "",
        text: ""
    },
    dark_circles: {
        title: "",
        text: ""
    },
    dehydration: {
        title: "",
        text: ""
    },
    oiliness: {
        title: "",
        text: ""
    },
    pores: {
        title: "",
        text: ""
    },
    redness: {
        title: "",
        text: ""
    },
    spots: {
        title: "",
        text: ""
    },
    uneven_skintone: {
        title: "",
        text: ""
    },
    wrinkles: {
        title: "",
        text: ""
    }
}

export const fmcCameraDict = {
    noFace: "sorry we could not detect your face",
    tiltedLeft: "Head titled too much to the left!",
    tiltedRight: "Head titled too much to the right!",
    tiltedUpwards: "Your face is tilted upwards",
    tiltedDawnwards: "Your face is tilted downwards",
    turnedLeft: "Your face is turned too much to the left!",
    turnedRight: "Your face is turned too much to the right!",
    tooFar: "Your face is too far away",
    tooClose: "Your face is too close",
    tooFarRight: "Your face is too far to the right",
    tooFarLeft: "Your face is too far to the left",
    tooHigh: "Your face is too high in the image",
    tooLow: "Your face is too low in the image",
    unevenLight: "Face is not evenly lit",
    perfect: "\u2705 Perfect - hold still please"
}

export async function loadModels() {
    try {
        // await faceapi.load('/assets/models')
        await faceapi.nets.tinyFaceDetector.loadFromUri('/assets/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models')
        // await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/assets/models')
        return true
    }
    catch (err) {
        console.log(err)
        return false
    }
}

export function getFaceDetectorOptions() {
    return new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
}

export function adjustOvalSize() {
    let camContainerDiv = document.getElementById("fmcInputVideo");
    document.getElementById("fmc_video_oval_mask").style.height = camContainerDiv.offsetHeight + "px";
    let scaleFactor;
    if (camContainerDiv.offsetHeight > camContainerDiv.offsetWidth) {
        scaleFactor = Math.round(camContainerDiv.offsetWidth / 600 * 1000);
    } else {
        scaleFactor = Math.round(camContainerDiv.offsetHeight / 600 * 1000);
    }
    document.getElementById("fmc_video_oval_mask").style.backgroundSize = scaleFactor + "px";
}

export function checkFaceInImage(faceCoords, drawFromVideo = true) {
    return new Promise((resolve, reject) => {
        let landmarks = faceCoords.landmarks;
        let lightParameters = getFaceLightProperties(faceCoords.landmarks, drawFromVideo);
        let cameraHint;
        let widthRatioLimitLower;
        let widthRatioLimitUpper;
        let xLimitLower;
        let xLimitUpper;
        let yLimitUpper;
        let yLimitLower;
        let leftEyePoint = landmarks.getLeftEye()[0];
        let rightEyePoint = landmarks.getRightEye()[3];
        let noseStartPoint = landmarks.getNose()[0];
        let noseTipPoint = landmarks.getNose()[3];
        let faceBox = faceCoords.alignedRect._box;
        let imageDims = faceCoords.alignedRect._imageDims;

        if (imageDims._width >= imageDims._height) {
            widthRatioLimitLower = 0.1;
            widthRatioLimitUpper = 0.9;
            xLimitLower = 0.1;
            xLimitUpper = 0.9;
            yLimitLower = 0.1;
            yLimitUpper = 0.9;
        } else {
            widthRatioLimitLower = 0.1;
            widthRatioLimitUpper = 0.9;
            xLimitLower = 0.1;
            xLimitUpper = 0.9;
            yLimitLower = 0.1;
            yLimitUpper = 0.9;
        }
        let relFaceBoxPos = {
            x: faceBox._x / imageDims._width,
            y: faceBox._y / imageDims._height
        }

        let widthRatio = faceBox._width / imageDims._width;
        let eyesTilt = (leftEyePoint._y - rightEyePoint._y) / (leftEyePoint._x - rightEyePoint._x);
        let noseTurn = (noseTipPoint._x - noseStartPoint._x) / (noseTipPoint._y - noseStartPoint._y);
        let noseTilt = (noseTipPoint._y - faceBox._y) / faceBox._height;
        let allowHint = true;

        if (eyesTilt > 0.1) {
            cameraHint = fmcCameraDict.tiltedLeft;
            allowHint = false;
        } else if (eyesTilt < -0.1) {
            cameraHint = fmcCameraDict.tiltedRight;
            allowHint = false;
        }

        if (noseTilt < 0.45 && allowHint) {
            cameraHint = fmcCameraDict.tiltedUpwards;
            allowHint = false;
        } else if (noseTilt > 0.55 && allowHint) {
            cameraHint = fmcCameraDict.tiltedDownwards;
            allowHint = false;
        }

        if (noseTurn > 0.1 && allowHint) {
            cameraHint = fmcCameraDict.turnedLeft;
            allowHint = false;
        } else if (noseTurn < -0.1 && allowHint) {
            cameraHint = fmcCameraDict.turnedRight;
            allowHint = false;
        }

        if (widthRatio < widthRatioLimitLower && allowHint) {
            cameraHint = fmcCameraDict.tooFar;
            allowHint = false;
        } else if (widthRatio > widthRatioLimitUpper && allowHint) {
            cameraHint = fmcCameraDict.tooClose;
            allowHint = false;
        }

        if (relFaceBoxPos.x < xLimitLower && allowHint) {
            cameraHint = fmcCameraDict.tooFarRight;
            allowHint = false;
        } else if (relFaceBoxPos.x > xLimitUpper && allowHint) {
            cameraHint = fmcCameraDict.tooFarLeft;
            allowHint = false;
        }

        if (relFaceBoxPos.y < yLimitLower && allowHint) {
            cameraHint = fmcCameraDict.tooHigh;
            allowHint = false;
        } else if (relFaceBoxPos.y > yLimitUpper && allowHint) {
            cameraHint = fmcCameraDict.tooLow;
            allowHint = false;
        }

        if (lightParameters.relativeLightDiff > 0.4 && allowHint) {
            cameraHint = fmcCameraDict.unevenLight;
            allowHint = false;
        }

        if (allowHint) {
            cameraHint = fmcCameraDict.perfect;
        }

        resolve(cameraHint);
    })
}

export async function onplay() {
    clearTimeout(lastOnPlayCallTimeout);
    fmcManualCaptureFlag = false;
    lastOnPlayCallTimeout = setTimeout(() => {
        if (!imageSent) {
            console.log("face detection not working - switching to manual capture");
            document.getElementById("fmc_camera_hint_message").innerHTML = "";
            document.getElementById("fmc_camera_capture_action_button").style.display = "block";
            fmcManualCaptureFlag = true;
        }
    }, lastCallTimeoutTimer)
    lastCallTimeoutTimer = 2000;

    try {
        adjustOvalSize();
    } catch (err) {
        console.error(err);
    }

    const videoEl = document.getElementById('fmcInputVideo')
    let options = getFaceDetectorOptions()
    let faces;

    try {
        faces = await faceapi.detectAllFaces(videoEl, options).withFaceLandmarks()
    } catch (errorDetectFace) {
        console.error("error in detect face: ", errorDetectFace);
    }

    if (faces.length > 0) {
        if (faces.length > 1) {
            document.getElementById("fmc_camera_hint_message").innerHTML = fmcImageErrors.multi_face;
        } else {
            let result = faces[0];
            let leftEyePoint = result.landmarks.getLeftEye()[0];
            let faceBox = result.alignedRect._box;
            checkFaceInImage(result)
                .then((cameraHint) => {
                    let eyeMovement = Math.sqrt(Math.pow(leftEyePoint._x - lastEyePosition._x, 2) + Math.pow(leftEyePoint._y - lastEyePosition._y, 2)) / faceBox._width;
                    // alert(resultsCounter)
                    if (cameraHint == fmcCameraDict.perfect) {
                        if (initalCaptureDelay > 2000) {
                            resultsCounter += 1;
                        }
                        if (eyeMovement > 0.1) {
                            resultsCounter = 0;
                        }
                    } else {
                        resultsCounter = 0;
                    }
                    lastEyePosition = leftEyePoint;
                    document.getElementById("fmc_camera_hint_message").innerHTML = cameraHint;
                    if (!imageSent && resultsCounter == 5) {
                        // alert('lets proceed')
                        clearTimeout(lastOnPlayCallTimeout);
                        sendVideoCanvasImage();
                        imageSent = true;
                        fmc_runStream = false;
                    }
                })
                .catch((faceCheckErr) => {
                    console.error("Face check error: ", faceCheckErr);
                });
        }

    } else {
        document.getElementById("fmc_camera_hint_message").innerHTML = fmcCameraDict.noFace;
        resultsCounter = 0;
    }
    initalCaptureDelay += 500;
}

export function getFaceLightProperties(landmarks, drawFromVideo = true) {
    let video = document.getElementById("fmcInputVideo");
    let canvas = document.getElementById("fmc_camera_canvas");

    let leftEyeBrow = landmarks.getLeftEyeBrow();
    let nose = landmarks.getNose();
    let jaw = landmarks.getJawOutline();

    let topLeft = {
        x: jaw[5]._x,
        y: leftEyeBrow[2]._y
    }
    let bottomLeft = {
        x: jaw[5]._x,
        y: jaw[5]._y
    }
    let topRight = {
        x: jaw[11]._x,
        y: leftEyeBrow[2]._y
    }
    let bottomRight = {
        x: jaw[11]._x,
        y: jaw[5]._y
    }
    let centerX = Math.round(0.5 * (jaw[11]._x + jaw[5]._x));


    let ctx = canvas.getContext("2d");

    if (drawFromVideo) {

        window.fmc_can_width = video.videoWidth;
        window.fmc_can_height = video.videoHeight;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    let leftSideImgData = ctx.getImageData(topLeft.x, topLeft.y, centerX - topLeft.x, bottomLeft.y - topLeft.y);
    let rightSideImgData = ctx.getImageData(centerX, topRight.y, topRight.x - centerX, bottomRight.y - topRight.y);

    let leftLight = 0;
    let rightLight = 0;

    for (let ii = 0; ii < leftSideImgData.data.length / 4; ii++) {
        leftLight += 0.2126 * leftSideImgData.data[4 * ii] + 0.7152 * leftSideImgData.data[4 * ii + 1] + 0.0722 * leftSideImgData.data[4 * ii + 2];
        rightLight += 0.2126 * rightSideImgData.data[4 * ii] + 0.7152 * rightSideImgData.data[4 * ii + 1] + 0.0722 * rightSideImgData.data[4 * ii + 2];
    }

    return {
        relativeLightDiff: Math.abs(leftLight - rightLight) / Math.max(leftLight, rightLight),
        averageLight: 0.5 * (leftLight + rightLight) / (leftSideImgData.data.length / 4)
    }

}

export function base64ToArrayBuffer(base64) {
    base64 = base64.replace(/^data\:([^\;]+)\;base64,/gmi, '');
    var binaryString = atob(base64);
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export function fmc_alignImageOrientation(base64imageInput) {

    return new Promise((resolve, reject) => {

        curImgData = base64imageInput;

        let fmc_body = document.getElementById("fmc_body");
        var exif = EXIF.readFromBinaryFile(base64ToArrayBuffer(base64imageInput));

        let canvas = document.getElementById("fmc_camera_canvas");
        let ctx = canvas.getContext("2d");

        if (exif.Orientation == undefined) {
            fmcImageOrientation = 1
        } else {
            fmcImageOrientation = exif.Orientation;
        }
        let tmpImage = new Image();

        console.log("image orientation on capture/upload: ", fmcImageOrientation);

        tmpImage.onload = () => {

            //let camDeniedCont = document.getElementById("fmc_camera_denied_container");

            fmcImSz = {
                w: tmpImage.naturalWidth,
                h: tmpImage.naturalHeight
            }

            let imgHeight = tmpImage.height;
            let imgWidth = tmpImage.width;

            canvas.width = imgWidth;
            canvas.height = imgHeight;

            ctx.drawImage(tmpImage, 0, 0, imgWidth, imgHeight);

            //canvas.style.opacity = 1;

            if (fmcManualCaptureFlag) {
                reject(base64imageInput);
            } else {

                let faceAiWorksFlag = false;
                setTimeout(() => {
                    if (!faceAiWorksFlag) {
                        fmcManualCaptureFlag = false;
                        reject(base64imageInput);
                    }
                }, 5000)

                try {
                    let options = getFaceDetectorOptions()
                    faceapi.detectAllFaces(canvas, options).withFaceLandmarks().then((landmarkDataArray) => {
                        faceAiWorksFlag = true;
                        console.log("LANDMARKS ARRAY IN ORIENTATION CALL: ", landmarkDataArray);
                        if (landmarkDataArray.length > 0) {

                            faceAIsawFace = true;
                            resolve(base64imageInput);
                        } else {

                            try {
                                if (fmcImageOrientation == 8 || fmcImageOrientation == 1) {

                                    canvas.width = imgHeight;
                                    canvas.height = imgWidth;

                                    ctx.rotate(-90 * Math.PI / 180);


                                    ctx.drawImage(tmpImage, -imgWidth, 0, imgWidth, imgHeight);

                                } else if (fmcImageOrientation == 6) {

                                    canvas.width = imgHeight;
                                    canvas.height = imgWidth;

                                    ctx.rotate(90 * Math.PI / 180);

                                    ctx.drawImage(tmpImage, 0, -imgHeight, imgWidth, imgHeight);

                                } else if (fmcImageOrientation == 3) {

                                    canvas.width = imgWidth;
                                    canvas.height = imgHeight;

                                    ctx.rotate(Math.PI);

                                    ctx.drawImage(tmpImage, -imgWidth, -imgHeight, imgWidth, imgHeight);

                                } else {

                                    canvas.width = imgWidth;
                                    canvas.height = imgHeight;

                                    ctx.drawImage(tmpImage, 0, 0, imgWidth, imgHeight);
                                }

                                setTimeout(() => {

                                    faceapi.detectAllFaces(canvas, options).withFaceLandmarks().then((landmarkDataArray) => {
                                        console.log("LANDMARKS ARRAY IN ORIENTATION CALL: ", landmarkDataArray);
                                        if (landmarkDataArray.length > 0) {
                                            faceAIsawFace = true;
                                            let imgData = canvas.toDataURL("image/jpeg");
                                            try {
                                                ctx.resetTransform();
                                            } catch (err) {
                                                ctx.rotate(0);
                                            }

                                            curImgData = imgData;

                                            //camDeniedCont.innerHTML = "FACE FOUND - sending";
                                            resolve(imgData);

                                        } else {
                                            //camDeniedCont.innerHTML = "NO FACE FOUND - REJECTING";
                                            curImgData = base64imageInput;
                                            reject(base64imageInput);
                                        }
                                    });

                                }, 10)


                            } catch (loadErr) {
                                console.log("error in orientating BB image", loadErr)
                                curImgData = base64imageInput;
                                reject(base64imageInput);
                            };
                        }
                    });

                } catch (err) {
                    curImgData = base64imageInput;
                    reject(base64imageInput);
                }
            }




        }
        try {
            tmpImage.src = base64imageInput;
        } catch (srcErr) {
            console.log("source error - ", srcErr);
            reject(base64imageInput);
        }
    })

}

export function fmcCropToFace(canvasId = "fmc_camera_canvas") {
    return new Promise((resolve, reject) => {

        let canvas = document.getElementById(canvasId);
        let ctx = canvas.getContext("2d");
        try {
            ctx.resetTransform();
        } catch (err) {
            ctx.rotate(0);
        }

        if (fmcManualCaptureFlag) {
            resolve(canvasId);
        } else {

            let fallbackFlag = true;
            setTimeout(() => {
                if (fallbackFlag) {
                    resolve(canvasId);
                }
            }, 3000)


            let options = getFaceDetectorOptions()
            faceapi.detectAllFaces(canvas, options).withFaceLandmarks().then((landmarkDataArray) => {
                fallbackFlag = false;
                console.log("Crop Face Landmark data Array: ", landmarkDataArray);
                if (landmarkDataArray.length == 1) {
                    landmarkDataArray.forEach((landmarkData, index) => {
                        console.log("Landmark Data at faceCrop: ", landmarkData);
                        let overlay = document.getElementById("fmc_camera_canvas_overlay");
                        overlay.style.opacity = 1;
                        overlay.width = canvas.width;
                        overlay.height = canvas.height;

                        let detectionBox = landmarkData.detection._box


                        let topY = Math.max(0, Math.round(detectionBox._y - 0.3 * detectionBox._height));
                        let bottomY = Math.min(Math.round(detectionBox._y + detectionBox._height), canvas.height);
                        let faceBoxHeight = bottomY - topY;


                        //let leftX = Math.max(0,Math.round(detectionBox._x - 0.5*(Math.max(faceBoxHeight,detectionBox._width) - detectionBox._width)));
                        //let rightX = Math.min(canvas.width,Math.round(detectionBox._x + 0.5*(Math.max(faceBoxHeight,detectionBox._width) + detectionBox._width)));

                        let leftX = Math.max(0, Math.round(detectionBox._x + 0.1 * detectionBox._width));
                        let rightX = Math.min(canvas.width, Math.round(detectionBox._x + 0.95 * detectionBox._width));

                        let faceBoxData = {
                            x: leftX,
                            y: topY,
                            w: rightX - leftX,
                            h: bottomY - topY
                        }


                        //console.log("detectionBox: ", detectionBox);
                        //console.log("faceBoxData: ", faceBoxData);
                        //console.log(leftX,rightX)

                        //fmcDrawRectOnCanvas(faceBoxData.x,faceBoxData.y,faceBoxData.w,faceBoxData.h,"fmc_camera_canvas_overlay")
                        //document.getElementById("fmc_camera_canvas").style.opacity = 1;


                        let faceImgData = ctx.getImageData(faceBoxData.x, faceBoxData.y, faceBoxData.w, faceBoxData.h);

                        canvas.width = faceBoxData.w;
                        canvas.height = faceBoxData.h;

                        fmcImSz = {
                            w: Math.round(faceBoxData.w),
                            h: Math.round(faceBoxData.h)
                        }

                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.putImageData(faceImgData, 0, 0);
                        setTimeout(() => {
                            resolve(canvasId);
                        }, 10)
                    });

                } else {
                    resolve(canvasId);
                }
            })
                .catch((e) => {
                    console.log("could not crop to face, sending full image");
                    resolve(canvasId);
                })
        }
    })
}

export function fmcLimitImageSize(canvasId = "fmc_camera_canvas") {
    return new Promise((resolve, reject) => {

        let scaleImageFlag = true;

        if (scaleImageFlag) {
            let canvas = document.getElementById(canvasId);
            let ctx = canvas.getContext("2d");


            let unscaledImgUrl = canvas.toDataURL("image/jpeg");


            let unscaledImg = new Image();

            unscaledImg.onload = () => {

                let imgWidth = unscaledImg.width;
                let imgHeight = unscaledImg.height;

                let scaleFactor = 1;
                //let pixelLimit = Math.round(1920/window.devicePixelRatio);
                let pixelLimit = 1920;
                if (imgHeight > imgWidth) {

                    scaleFactor = Math.min(pixelLimit / imgHeight, 1);
                } else {
                    scaleFactor = Math.min(pixelLimit / imgWidth, 1);
                }

                fmcImSz = {
                    w: Math.round(scaleFactor * imgWidth),
                    h: Math.round(scaleFactor * imgHeight)
                }

                console.log("image height / width ", imgHeight + "/" + imgWidth);

                canvas.width = Math.round(scaleFactor * imgWidth);
                canvas.height = Math.round(scaleFactor * imgHeight);
                setTimeout(() => {
                    ctx.drawImage(unscaledImg, 0, 0, Math.round(imgWidth * scaleFactor), Math.round(imgHeight * scaleFactor));
                    console.log("used scalefactor for image: ", scaleFactor);
                    setTimeout(() => {
                        resolve(canvasId);
                    }, 10)

                }, 10)
            }
            unscaledImg.src = unscaledImgUrl;
        } else {
            resolve(canvasId);

        }

    })
}

export function fmcCalcConcerns(canvasId = "fmc_camera_canvas") {
    return new Promise((resolve, reject) => {
        if (fmcManualCaptureFlag) {
            reject({ success: false, message: "fmcManualCaptureFlag is true" });
        } else {

            try {

                let options = getFaceDetectorOptions()
                let canvas = document.getElementById(canvasId);
                let ctx = canvas.getContext("2d");


                let overlay = document.getElementById("fmc_camera_canvas_overlay");
                let overlayctx = overlay.getContext("2d");
                overlay.width = canvas.width;
                overlay.height = canvas.height;

                faceapi.detectAllFaces(canvas, options).withFaceLandmarks().then((landmarkDataArray) => {

                    console.log("Calculated Concerns Landmark data Array: ", landmarkDataArray);
                    let darkCircleScore = -1;
                    let dehydrationScore = -1;

                    landmarkDataArray.forEach((landmarkData, index) => {
                        console.log("Landmark Dat: ", landmarkData);

                        let leftEye = [];
                        let rightEye = [];
                        let leftEyeBrow = [];
                        let rightEyeBrow = [];
                        let jaw = [];
                        let mouth = [];
                        let nose = [];

                        if (landmarkData.landmarks._shift._x >= 0 && landmarkData.landmarks._shift._y >= 0) {
                            leftEye = landmarkData.landmarks.getLeftEye();
                            rightEye = landmarkData.landmarks.getRightEye();
                            leftEyeBrow = landmarkData.landmarks.getLeftEyeBrow();
                            rightEyeBrow = landmarkData.landmarks.getRightEyeBrow();
                            jaw = landmarkData.landmarks.getJawOutline();
                            mouth = landmarkData.landmarks.getMouth();
                            nose = landmarkData.landmarks.getNose();
                        } else if (landmarkData.landmarks._shift._x < 0 && landmarkData.landmarks._shift._y < 0) {
                            leftEye = landmarkData.unshiftedLandmarks.getLeftEye();
                            rightEye = landmarkData.unshiftedLandmarks.getRightEye();
                            leftEyeBrow = landmarkData.unshiftedLandmarks.getLeftEyeBrow();
                            rightEyeBrow = landmarkData.unshiftedLandmarks.getRightEyeBrow();
                            jaw = landmarkData.unshiftedLandmarks.getJawOutline();
                            mouth = landmarkData.unshiftedLandmarks.getMouth();
                            nose = landmarkData.unshiftedLandmarks.getNose();
                        } else {
                            let unshiftedLeftEye = landmarkData.unshiftedLandmarks.getLeftEye();
                            let unshiftedRightEye = landmarkData.unshiftedLandmarks.getRightEye();
                            let shiftedLeftEye = landmarkData.landmarks.getLeftEye();
                            let shiftedRightEye = landmarkData.landmarks.getRightEye();

                            let unshiftedLeftEyeBrow = landmarkData.unshiftedLandmarks.getLeftEyeBrow();
                            let unshiftedRightEyeBrow = landmarkData.unshiftedLandmarks.getRightEyeBrow();
                            let shiftedLeftEyeBrow = landmarkData.landmarks.getLeftEyeBrow();
                            let shiftedRightEyeBrow = landmarkData.landmarks.getRightEyeBrow();

                            let shiftedJaw = landmarkData.landmarks.getJawOutline();
                            let unshiftedJaw = landmarkData.unshiftedLandmarks.getJawOutline();

                            let shiftedMouth = landmarkData.landmarks.getMouth();
                            let unshiftedMouth = landmarkData.unshiftedLandmarks.getMouth();

                            let shiftedNose = landmarkData.landmarks.getMouth();
                            let unshiftedNose = landmarkData.unshiftedLandmarks.getNose();


                            if (landmarkData.landmarks._shift._x >= 0) {
                                shiftedLeftEye.forEach((eyePoint, index) => {
                                    leftEye.push({ _x: shiftedLeftEye[index]._x, _y: unshiftedLeftEye[index]._y });
                                    rightEye.push({ _x: shiftedRightEye[index]._x, _y: unshiftedRightEye[index]._y })
                                });
                                shiftedLeftEyeBrow.forEach((eyeBrowPoint, index) => {
                                    leftEyeBrow.push({ _x: shiftedLeftEyeBrow[index]._x, _y: unshiftedLeftEyeBrow[index]._y });
                                    rightEyeBrow.push({ _x: shiftedRightEyeBrow[index]._x, _y: unshiftedRightEyeBrow[index]._y })
                                });
                                shiftedJaw.forEach((jawPoint, index) => {
                                    jaw.push({ _x: shiftedJaw[index]._x, _y: unshiftedJaw[index]._y });
                                });
                                shiftedMouth.forEach((mouthPoint, index) => {
                                    mouth.push({ _x: shiftedMouth[index]._x, _y: unshiftedMouth[index]._y });
                                });
                                shiftedNose.forEach((nosePoint, index) => {
                                    try {
                                        nose.push({ _x: shiftedNose[index]._x, _y: unshiftedNose[index]._y });
                                    } catch (err) {
                                        nose.push({ _x: shiftedNose[index]._x, _y: shiftedNose[index]._y });
                                    }
                                });

                            } else {
                                shiftedLeftEye.forEach((eyePoint, index) => {
                                    leftEye.push({ _x: unshiftedLeftEye[index]._x, _y: shiftedLeftEye[index]._y });
                                    rightEye.push({ _x: unshiftedRightEye[index]._x, _y: shiftedRightEye[index]._y })
                                });
                                shiftedLeftEyeBrow.forEach((eyeBrowPoint, index) => {
                                    leftEyeBrow.push({ _x: unshiftedLeftEyeBrow[index]._x, _y: shiftedLeftEyeBrow[index]._y });
                                    rightEyeBrow.push({ _x: unshiftedRightEyeBrow[index]._x, _y: shiftedRightEyeBrow[index]._y })
                                });
                                shiftedJaw.forEach((jawPoint, index) => {
                                    jaw.push({ _x: unshiftedJaw[index]._x, _y: shiftedJaw[index]._y });
                                });
                                shiftedMouth.forEach((mouthPoint, index) => {
                                    mouth.push({ _x: unshiftedMouth[index]._x, _y: shiftedMouth[index]._y });
                                });
                                shiftedNose.forEach((nosePoint, index) => {
                                    try {
                                        nose.push({ _x: unshiftedNose[index]._x, _y: shiftedNose[index]._y });
                                    } catch (err) {
                                        nose.push({ _x: shiftedNose[index]._x, _y: shiftedNose[index]._y });
                                    }
                                });
                            }
                        }



                        let leftEyeBoxWidth = leftEye[3]._x - leftEye[0]._x;
                        let rightEyeBoxWidth = rightEye[3]._x - rightEye[0]._x;

                        let leftEyeBoxHeight = Math.max(leftEye[4]._y, leftEye[5]._y) - Math.min(leftEye[1]._y, leftEye[2]._y);
                        let rightEyeBoxHeight = Math.max(rightEye[4]._y, rightEye[5]._y) - Math.min(rightEye[1]._y, rightEye[2]._y);

                        let calcBoxWidth = Math.max(1.2 * leftEyeBoxWidth, 1.2 * rightEyeBoxWidth);
                        let calcBoxHeight = Math.max(1.2 * leftEyeBoxHeight, 1.2 * rightEyeBoxHeight);

                        let leftDarkCircleBox = { x: leftEye[0]._x - leftEyeBoxWidth * 0.1, y: Math.max(leftEye[4]._y, leftEye[5]._y) + 0.6 * leftEyeBoxHeight, w: calcBoxWidth, h: calcBoxHeight };
                        let rightDarkCircleBox = { x: rightEye[0]._x - rightEyeBoxWidth * 0.1, y: Math.max(rightEye[4]._y, rightEye[5]._y) + 0.6 * rightEyeBoxHeight, w: calcBoxWidth, h: calcBoxHeight };



                        let leftCompareBox = {
                            x: leftDarkCircleBox.x - 0.3 * leftDarkCircleBox.w,
                            y: leftDarkCircleBox.y + leftDarkCircleBox.h,
                            w: leftDarkCircleBox.w,
                            h: leftDarkCircleBox.h
                        }
                        let rightCompareBox = {
                            x: rightDarkCircleBox.x + 0.3 * leftDarkCircleBox.w,
                            y: rightDarkCircleBox.y + rightDarkCircleBox.h,
                            w: rightDarkCircleBox.w,
                            h: rightDarkCircleBox.h
                        }


                        let darkCircleImgDataLeft = ctx.getImageData(leftDarkCircleBox.x, leftDarkCircleBox.y, leftDarkCircleBox.w, leftDarkCircleBox.h);
                        let compareImgDataLeft = ctx.getImageData(leftCompareBox.x, leftCompareBox.y, leftCompareBox.w, leftCompareBox.h);
                        let darkCircleImgDataRight = ctx.getImageData(rightDarkCircleBox.x, rightDarkCircleBox.y, rightDarkCircleBox.w, rightDarkCircleBox.h);
                        let compareImgDataRight = ctx.getImageData(rightCompareBox.x, rightCompareBox.y, rightCompareBox.w, rightCompareBox.h);

                        let darkCircleR = 0;
                        let darkCircleG = 0;
                        let darkCircleB = 0;
                        let compareR = 0;
                        let compareG = 0;
                        let compareB = 0;


                        for (let ii = 0; ii < darkCircleImgDataLeft.data.length / 4; ii++) {
                            darkCircleR += darkCircleImgDataLeft.data[4 * ii] / 255 + darkCircleImgDataRight.data[4 * ii] / 255;
                            darkCircleG += darkCircleImgDataLeft.data[4 * ii + 1] / 255 + darkCircleImgDataRight.data[4 * ii + 1] / 255;
                            darkCircleB += darkCircleImgDataLeft.data[4 * ii + 2] / 255 + darkCircleImgDataRight.data[4 * ii + 2] / 255;
                            compareR += compareImgDataLeft.data[4 * ii] / 255 + compareImgDataRight.data[4 * ii] / 255;
                            compareG += compareImgDataLeft.data[4 * ii + 1] / 255 + compareImgDataRight.data[4 * ii + 1] / 255;
                            compareB += compareImgDataLeft.data[4 * ii + 2] / 255 + compareImgDataRight.data[4 * ii + 2] / 255;
                        }

                        let darkCircleLight = 0.2126 * darkCircleR + 0.7152 * darkCircleG + 0.0722 * darkCircleB;
                        let compareLight = 0.2126 * compareR + 0.7152 * compareG + 0.0722 * compareB;


                        darkCircleScore = Math.max(1, Math.min(5, Math.floor(-50 / 3 * darkCircleLight / compareLight + 52 / 3)));

                        if (isNaN(darkCircleScore)) {
                            darkCircleScore = 2;
                        }
                    })


                    resolve({ concerns: { dark_circles: darkCircleScore, dehydration: "2" }, canvasId: canvasId });
                })
                    .catch((e) => {
                        console.log("error in face detection on calc scores")
                        resolve({ concerns: { dark_circles: "2", dehydration: "2" }, canvasId: canvasId });
                    })
            } catch (err) {
                reject(err);
            }
        }
    })
}

export function getColorFromGradient(gradientPoint) {
    let colorObj = { r: 0, g: 0, b: 0 }
    if (gradientPoint > 210) {
        colorObj.r = 225 + Math.round(30 * ((gradientPoint - 210) / 45));
        colorObj.g = 141 - Math.round(141 * ((gradientPoint - 210) / 45));
        colorObj.b = 0;
    }
    else if (gradientPoint > 160) {
        colorObj.r = 242 - Math.round(13 * ((gradientPoint - 160) / 50));
        colorObj.g = 226 - Math.round(85 * ((gradientPoint - 160) / 50));
        colorObj.b = 0;
    } else {
        colorObj.r = 55 - Math.round(44 * (gradientPoint / 160));
        colorObj.g = 192 - Math.round(50 * (gradientPoint / 160));
        colorObj.b = 176 + Math.round(16 * (gradientPoint / 160));
    }
    return colorObj;
}

export function calcOpacityEllipse(point_x, point_y, ellRectObj, fullAlphaFact = 0.05) {

    let scaleDimensions = 0.9;

    counter++;
    if (counter % 100 == 0 || true) {
        let aSqu = (ellRectObj.w / 2 * scaleDimensions) * (ellRectObj.w / 2 * scaleDimensions);
        let bSqu = (ellRectObj.h / 2 * scaleDimensions) * (ellRectObj.h / 2 * scaleDimensions);
        let centX = ellRectObj.x + 0.5 * ellRectObj.w;
        let centY = ellRectObj.y + 0.5 * ellRectObj.h;


        let ellVal = (point_x - centX) * (point_x - centX) / aSqu + (point_y - centY) * (point_y - centY) / bSqu - 1;
        let alpha255 = Math.round(Math.min(1, Math.max(0, -ellVal / fullAlphaFact)) * 255);


        return alpha255;

    } else {
        return 0;
    }
}

export function fmcMakeDehydrationMaskImageURL(canvasId = "fmc_dehydration_canvas") {
    return new Promise((resolve, reject) => {

        try {

            let options = getFaceDetectorOptions()
            let canvas = document.getElementById(canvasId);
            let ctx = canvas.getContext("2d");

            let red_canvas = document.getElementById("fmc_redness_canvas");
            let red_ctx = red_canvas.getContext("2d");

            faceapi.detectAllFaces(canvas, options).withFaceLandmarks().then((landmarkDataArray) => {
                console.log("Image Landmark data Array: ", landmarkDataArray);

                landmarkDataArray.forEach((landmarkData, index) => {
                    console.log("Landmark Data DEHYDRATION: ", landmarkData);

                    let leftEye = [];
                    let rightEye = [];
                    let leftEyeBrow = [];
                    let rightEyeBrow = [];
                    let jaw = [];
                    let mouth = [];
                    let nose = [];

                    if (landmarkData.landmarks._shift._x >= 0 && landmarkData.landmarks._shift._y >= 0) {
                        leftEye = landmarkData.landmarks.getLeftEye();
                        rightEye = landmarkData.landmarks.getRightEye();
                        leftEyeBrow = landmarkData.landmarks.getLeftEyeBrow();
                        rightEyeBrow = landmarkData.landmarks.getRightEyeBrow();
                        jaw = landmarkData.landmarks.getJawOutline();
                        mouth = landmarkData.landmarks.getMouth();
                        nose = landmarkData.landmarks.getNose();
                    } else if (landmarkData.landmarks._shift._x < 0 && landmarkData.landmarks._shift._y < 0) {
                        leftEye = landmarkData.unshiftedLandmarks.getLeftEye();
                        rightEye = landmarkData.unshiftedLandmarks.getRightEye();
                        leftEyeBrow = landmarkData.unshiftedLandmarks.getLeftEyeBrow();
                        rightEyeBrow = landmarkData.unshiftedLandmarks.getRightEyeBrow();
                        jaw = landmarkData.unshiftedLandmarks.getJawOutline();
                        mouth = landmarkData.unshiftedLandmarks.getMouth();
                        nose = landmarkData.unshiftedLandmarks.getNose();
                    } else {
                        let unshiftedLeftEye = landmarkData.unshiftedLandmarks.getLeftEye();
                        let unshiftedRightEye = landmarkData.unshiftedLandmarks.getRightEye();
                        let shiftedLeftEye = landmarkData.landmarks.getLeftEye();
                        let shiftedRightEye = landmarkData.landmarks.getRightEye();

                        let unshiftedLeftEyeBrow = landmarkData.unshiftedLandmarks.getLeftEyeBrow();
                        let unshiftedRightEyeBrow = landmarkData.unshiftedLandmarks.getRightEyeBrow();
                        let shiftedLeftEyeBrow = landmarkData.landmarks.getLeftEyeBrow();
                        let shiftedRightEyeBrow = landmarkData.landmarks.getRightEyeBrow();

                        let shiftedJaw = landmarkData.landmarks.getJawOutline();
                        let unshiftedJaw = landmarkData.unshiftedLandmarks.getJawOutline();

                        let shiftedMouth = landmarkData.landmarks.getMouth();
                        let unshiftedMouth = landmarkData.unshiftedLandmarks.getMouth();

                        let shiftedNose = landmarkData.landmarks.getMouth();
                        let unshiftedNose = landmarkData.unshiftedLandmarks.getNose();


                        if (landmarkData.landmarks._shift._x >= 0) {
                            shiftedLeftEye.forEach((eyePoint, index) => {
                                leftEye.push({ _x: shiftedLeftEye[index]._x, _y: unshiftedLeftEye[index]._y });
                                rightEye.push({ _x: shiftedRightEye[index]._x, _y: unshiftedRightEye[index]._y })
                            });
                            shiftedLeftEyeBrow.forEach((eyeBrowPoint, index) => {
                                leftEyeBrow.push({ _x: shiftedLeftEyeBrow[index]._x, _y: unshiftedLeftEyeBrow[index]._y });
                                rightEyeBrow.push({ _x: shiftedRightEyeBrow[index]._x, _y: unshiftedRightEyeBrow[index]._y })
                            });
                            shiftedJaw.forEach((jawPoint, index) => {
                                jaw.push({ _x: shiftedJaw[index]._x, _y: unshiftedJaw[index]._y });
                            });
                            shiftedMouth.forEach((mouthPoint, index) => {
                                mouth.push({ _x: shiftedMouth[index]._x, _y: unshiftedMouth[index]._y });
                            });
                            shiftedNose.forEach((nosePoint, index) => {
                                try {
                                    nose.push({ _x: shiftedNose[index]._x, _y: unshiftedNose[index]._y });
                                } catch (err) {
                                    nose.push({ _x: shiftedNose[index]._x, _y: shiftedNose[index]._y });
                                }
                            });

                        } else {
                            shiftedLeftEye.forEach((eyePoint, index) => {
                                leftEye.push({ _x: unshiftedLeftEye[index]._x, _y: shiftedLeftEye[index]._y });
                                rightEye.push({ _x: unshiftedRightEye[index]._x, _y: shiftedRightEye[index]._y })
                            });
                            shiftedLeftEyeBrow.forEach((eyeBrowPoint, index) => {
                                leftEyeBrow.push({ _x: unshiftedLeftEyeBrow[index]._x, _y: shiftedLeftEyeBrow[index]._y });
                                rightEyeBrow.push({ _x: unshiftedRightEyeBrow[index]._x, _y: shiftedRightEyeBrow[index]._y })
                            });
                            shiftedJaw.forEach((jawPoint, index) => {
                                jaw.push({ _x: unshiftedJaw[index]._x, _y: shiftedJaw[index]._y });
                            });
                            shiftedMouth.forEach((mouthPoint, index) => {
                                mouth.push({ _x: unshiftedMouth[index]._x, _y: shiftedMouth[index]._y });
                            });
                            shiftedNose.forEach((nosePoint, index) => {
                                try {
                                    nose.push({ _x: unshiftedNose[index]._x, _y: shiftedNose[index]._y });
                                } catch (err) {
                                    nose.push({ _x: shiftedNose[index]._x, _y: shiftedNose[index]._y });
                                }
                            });
                        }
                    }

                    let topLeftEyeBrowY = leftEyeBrow[2]._y;
                    let topRightEyeBrowY = rightEyeBrow[2]._y;
                    let lowLeftEyeY = Math.max(leftEye[4]._y, leftEye[5]._y);
                    let lowRightEyeY = Math.max(rightEye[4]._y, rightEye[5]._y);

                    let faceRectToScan = {
                        x: Math.round(jaw[2]._x) + 0.0 * (jaw[14]._x - jaw[2]._x),
                        y: Math.round(2.0 * Math.min(topLeftEyeBrowY, topRightEyeBrowY) - 1.0 * Math.min(lowLeftEyeY, lowRightEyeY) - 0.05 * (jaw[8]._y - 2.0 * Math.min(topLeftEyeBrowY, topRightEyeBrowY) + 1.0 * Math.min(lowLeftEyeY, lowRightEyeY))),
                        w: Math.round(1.0 * (jaw[14]._x - jaw[2]._x)), //w: Math.round(1.0*(rightEyeBrow[4]._x - leftEyeBrow[0]._x)),
                        h: Math.round(1.1 * (jaw[8]._y - 2.0 * Math.min(topLeftEyeBrowY, topRightEyeBrowY) + 1.0 * Math.min(lowLeftEyeY, lowRightEyeY)))
                    }

                    let leftEyeBlankRect = {
                        x: Math.round(jaw[0]._x),
                        y: Math.round(topLeftEyeBrowY - 0.2 * (lowLeftEyeY - topLeftEyeBrowY)),
                        w: Math.round(0.5 * leftEye[3]._x + 0.5 * rightEye[0]._x - jaw[0]._x),
                        h: Math.round(1.7 * (lowLeftEyeY - topLeftEyeBrowY))
                    }

                    let rightEyeBlankRect = {
                        x: Math.round(leftEye[3]._x + 0.5 * (rightEye[0]._x - leftEye[3]._x)),
                        y: Math.round(topRightEyeBrowY - 0.2 * (lowRightEyeY - topRightEyeBrowY)),
                        w: Math.round(jaw[16]._x - leftEye[3]._x - 0.5 * (rightEye[0]._x - leftEye[3]._x)),
                        h: Math.round(1.7 * (lowRightEyeY - topRightEyeBrowY))
                    }

                    let mouthBlankRect = {
                        x: Math.round(mouth[0]._x - 0.2 * (mouth[6]._x - mouth[0]._x)),
                        y: Math.round(mouth[2]._y - 0.2 * (mouth[9]._y - mouth[2]._y)),
                        w: Math.round(1.4 * (mouth[6]._x - mouth[0]._x)),
                        h: Math.round(1.4 * (mouth[9]._y - mouth[2]._y))
                    }

                    let noseBlankRect = {
                        x: Math.round(nose[4]._x - 0.5 * (nose[8]._x - nose[4]._x)),
                        y: Math.round(nose[3]._y - 0.7 * (nose[6]._y - nose[3]._y)),
                        w: Math.round(2 * (nose[8]._x - nose[4]._x)),
                        h: Math.round(2 * (nose[6]._y - nose[3]._y))
                    }



                    let dehydrationImgData = ctx.getImageData(faceRectToScan.x, faceRectToScan.y, faceRectToScan.w, faceRectToScan.h);



                    let newImgData = ctx.createImageData(dehydrationImgData.width, dehydrationImgData.height)
                    let rednessImgData = ctx.createImageData(dehydrationImgData.width, dehydrationImgData.height)

                    let y = 0;
                    let x = 0;
                    let modTarget = Math.ceil(dehydrationImgData.height / 200)

                    function processImageBlocks() {
                        return new Promise((imgRes, imgRej) => {

                            //console.log("processing image block - cur y = ",y);
                            let initBlockCall = true;
                            while (y < dehydrationImgData.height && (y % modTarget != 0) || initBlockCall) {
                                initBlockCall = false;
                                while (x < dehydrationImgData.width) {

                                    let ii = y * dehydrationImgData.width + x;


                                    let minBlue = 255;
                                    let maxBlue = 0;
                                    let avRed = 0;
                                    let avCounter = 0;

                                    for (var scan_x = -10; scan_x < 11; scan_x++) {
                                        for (var scan_y = -10; scan_y < 11; scan_y++) {
                                            let idx = (ii - scan_x + scan_y * dehydrationImgData.width);
                                            while (idx < 0) {
                                                idx += dehydrationImgData.data.length / 4;
                                            }
                                            while (idx >= dehydrationImgData.data.length / 4) {
                                                idx -= dehydrationImgData.data.length / 4;
                                            }

                                            minBlue = Math.min(minBlue, dehydrationImgData.data[idx * 4 + 2]);
                                            maxBlue = Math.max(maxBlue, dehydrationImgData.data[idx * 4 + 2]);
                                            avRed += dehydrationImgData.data[idx * 4 + 0] / (dehydrationImgData.data[idx * 4 + 0] + dehydrationImgData.data[idx * 4 + 1] + dehydrationImgData.data[idx * 4 + 2]);
                                            avCounter++;
                                        }
                                    }

                                    let curColorObj = getColorFromGradient(Math.min(Math.max(Math.round((dehydrationImgData.data[ii * 4 + 2] - minBlue) / (maxBlue - minBlue) * 255), 0), 255));

                                    newImgData.data[ii * 4 + 0] = curColorObj.r;
                                    newImgData.data[ii * 4 + 1] = curColorObj.g;
                                    newImgData.data[ii * 4 + 2] = curColorObj.b;

                                    let faceAlpha = calcOpacityEllipse(ii % dehydrationImgData.width, Math.floor(ii / dehydrationImgData.width), { x: 0, y: 0, w: dehydrationImgData.width, h: dehydrationImgData.height }, 0.2);
                                    let leftEyeAlpha = 255 - calcOpacityEllipse(ii % dehydrationImgData.width, Math.floor(ii / dehydrationImgData.width), { x: Math.round(leftEyeBlankRect.x - faceRectToScan.x), y: Math.round(leftEyeBlankRect.y - faceRectToScan.y), w: leftEyeBlankRect.w, h: leftEyeBlankRect.h }, 0.4);
                                    let rightEyeAlpha = 255 - calcOpacityEllipse(ii % dehydrationImgData.width, Math.floor(ii / dehydrationImgData.width), { x: Math.round(rightEyeBlankRect.x - faceRectToScan.x), y: Math.round(rightEyeBlankRect.y - faceRectToScan.y), w: rightEyeBlankRect.w, h: rightEyeBlankRect.h }, 0.4);
                                    let mouthAlpha = 255 - calcOpacityEllipse(ii % dehydrationImgData.width, Math.floor(ii / dehydrationImgData.width), { x: Math.round(mouthBlankRect.x - faceRectToScan.x), y: Math.round(mouthBlankRect.y - faceRectToScan.y), w: mouthBlankRect.w, h: mouthBlankRect.h }, 0.4);
                                    let noseAlpha = 255 - calcOpacityEllipse(ii % dehydrationImgData.width, Math.floor(ii / dehydrationImgData.width), { x: Math.round(noseBlankRect.x - faceRectToScan.x), y: Math.round(noseBlankRect.y - faceRectToScan.y), w: noseBlankRect.w, h: noseBlankRect.h }, 0.4);

                                    let maskAlpha = 1 * Math.min(faceAlpha, leftEyeAlpha, rightEyeAlpha, mouthAlpha, noseAlpha) / 255;

                                    newImgData.data[ii * 4 + 0] = Math.round(maskAlpha * newImgData.data[ii * 4 + 0] + (1 - maskAlpha) * dehydrationImgData.data[ii * 4 + 0]);
                                    newImgData.data[ii * 4 + 1] = Math.round(maskAlpha * newImgData.data[ii * 4 + 1] + (1 - maskAlpha) * dehydrationImgData.data[ii * 4 + 1]);
                                    newImgData.data[ii * 4 + 2] = Math.round(maskAlpha * newImgData.data[ii * 4 + 2] + (1 - maskAlpha) * dehydrationImgData.data[ii * 4 + 2]);
                                    newImgData.data[ii * 4 + 3] = 255;

                                    avRed /= avCounter;

                                    let curRedRatio = dehydrationImgData.data[ii * 4 + 0] / (dehydrationImgData.data[ii * 4 + 0] + dehydrationImgData.data[ii * 4 + 1] + dehydrationImgData.data[ii * 4 + 2]);
                                    if (curRedRatio + 0.005 > avRed) {
                                        rednessImgData.data[ii * 4 + 0] = dehydrationImgData.data[ii * 4 + 0];
                                        rednessImgData.data[ii * 4 + 1] = Math.round(dehydrationImgData.data[ii * 4 + 1] * (1 - 10 * (curRedRatio + 0.005 - avRed)));
                                        rednessImgData.data[ii * 4 + 2] = Math.round(dehydrationImgData.data[ii * 4 + 2] * (1 - 10 * (curRedRatio + 0.005 - avRed)));
                                    } else {
                                        rednessImgData.data[ii * 4 + 0] = dehydrationImgData.data[ii * 4 + 0];
                                        rednessImgData.data[ii * 4 + 1] = dehydrationImgData.data[ii * 4 + 1];
                                        rednessImgData.data[ii * 4 + 2] = dehydrationImgData.data[ii * 4 + 2];
                                    }

                                    rednessImgData.data[ii * 4 + 0] = Math.round(maskAlpha * rednessImgData.data[ii * 4 + 0] + (1 - maskAlpha) * dehydrationImgData.data[ii * 4 + 0]);
                                    rednessImgData.data[ii * 4 + 1] = Math.round(maskAlpha * rednessImgData.data[ii * 4 + 1] + (1 - maskAlpha) * dehydrationImgData.data[ii * 4 + 1]);
                                    rednessImgData.data[ii * 4 + 2] = Math.round(maskAlpha * rednessImgData.data[ii * 4 + 2] + (1 - maskAlpha) * dehydrationImgData.data[ii * 4 + 2]);
                                    rednessImgData.data[ii * 4 + 3] = 255;

                                    x++;

                                }
                                x = 0;
                                y++;
                            }

                            ctx.putImageData(newImgData, faceRectToScan.x, faceRectToScan.y);
                            red_ctx.putImageData(rednessImgData, faceRectToScan.x, faceRectToScan.y);
                            if (y < dehydrationImgData.height) {
                                setTimeout(() => {
                                    processImageBlocks()
                                }, 5)
                            } else {

                                console.log("DEHYDRATION IMAGE DATA - ", newImgData);
                                console.log("REDNESS IMAGE DATA - ", rednessImgData);



                                let imageMaskUrl = canvas.toDataURL("image/jpeg");
                                fmcRednessImgUrl = red_canvas.toDataURL("image/jpeg");
                                //document.getElementById("fmc_loading_analyze_scan_bar").style.display = "block";
                                dehydrationImgData = null;
                                newImgData = null;
                                resolve(imageMaskUrl);
                            }
                        })
                    }
                    processImageBlocks()


                });
            })
                .catch((e) => {
                    console.log("cannot create dehydration mask - using original");
                    let imgUrl = canvas.toDataURL("image/jpeg");
                    fmcRednessImgUrl = imgUrl;
                    resolve(imgUrl);
                });

        } catch (err) {
            console.log("concern calculation failed", err);
            reject(err);
        }

    })

}

export function fmcDrawWhiteEllipseInRectOnCanvas(point_x, point_y, width, height, canvasId = "fmc_dark_circles_canvas") {
    console.log("white circle parameters: x=" + point_x + " y=" + point_y + " w=" + width + " h=" + height);
    let ctx = document.getElementById(canvasId).getContext("2d");

    let scaleFact = 1.2;

    let scaledWidth = width * 1.2;
    let scaledHeight = height * 1.2;

    let centerX = point_x + 0.5 * width;
    let centerY = point_y + 0.5 * height;


    ctx.beginPath();
    ctx.moveTo(centerX - scaledWidth / 2, centerY); // A1

    ctx.bezierCurveTo(
        centerX - scaledWidth / 2, centerY - scaledHeight / 2, // C1
        centerX + scaledWidth / 2, centerY - scaledHeight / 2, // C2
        centerX + scaledWidth / 2, centerY); // A2

    ctx.bezierCurveTo(
        centerX + scaledWidth / 2, centerY + scaledHeight / 2, // C3
        centerX - scaledWidth / 2, centerY + scaledHeight / 2, // C4
        centerX - scaledWidth / 2, centerY); // A1

    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.closePath();

}

export function fmcMakeDarkCirclesMaskImageURL(canvasId = "fmc_dark_circles_canvas") {
    return new Promise((resolve, reject) => {
        try {

            let options = getFaceDetectorOptions()
            let canvas = document.getElementById(canvasId);

            let ctx = canvas.getContext("2d");

            faceapi.detectAllFaces(canvas, options).withFaceLandmarks().then((landmarkDataArray) => {
                console.log("Image Landmark data Array: ", landmarkDataArray);

                landmarkDataArray.forEach((landmarkData, index) => {
                    console.log("Landmark Dat: ", landmarkData);

                    let leftEye = [];
                    let rightEye = [];


                    if (landmarkData.landmarks._shift._x >= 0 && landmarkData.landmarks._shift._y >= 0) {
                        leftEye = landmarkData.landmarks.getLeftEye();
                        rightEye = landmarkData.landmarks.getRightEye();
                    } else if (landmarkData.landmarks._shift._x < 0 && landmarkData.landmarks._shift._y < 0) {
                        leftEye = landmarkData.unshiftedLandmarks.getLeftEye();
                        rightEye = landmarkData.unshiftedLandmarks.getRightEye();
                    } else {
                        let unshiftedLeftEye = landmarkData.unshiftedLandmarks.getLeftEye();
                        let unshiftedRightEye = landmarkData.unshiftedLandmarks.getRightEye();
                        let shiftedLeftEye = landmarkData.landmarks.getLeftEye();
                        let shiftedRightEye = landmarkData.landmarks.getRightEye();

                        if (landmarkData.landmarks._shift._x >= 0) {
                            shiftedLeftEye.forEach((eyePoint, index) => {
                                leftEye.push({ _x: shiftedLeftEye[index]._x, _y: unshiftedLeftEye[index]._y });
                                rightEye.push({ _x: shiftedRightEye[index]._x, _y: unshiftedRightEye[index]._y })
                            });

                        } else {
                            shiftedLeftEye.forEach((eyePoint, index) => {
                                leftEye.push({ _x: unshiftedLeftEye[index]._x, _y: shiftedLeftEye[index]._y });
                                rightEye.push({ _x: unshiftedRightEye[index]._x, _y: shiftedRightEye[index]._y })
                            });
                        }
                    }



                    let leftEyeBoxWidth = leftEye[3]._x - leftEye[0]._x;
                    let rightEyeBoxWidth = rightEye[3]._x - rightEye[0]._x;

                    let leftEyeBoxHeight = Math.max(leftEye[4]._y, leftEye[5]._y) - Math.min(leftEye[1]._y, leftEye[2]._y);
                    let rightEyeBoxHeight = Math.max(rightEye[4]._y, rightEye[5]._y) - Math.min(rightEye[1]._y, rightEye[2]._y);


                    let leftDarkCircleBox = { x: leftEye[0]._x - leftEyeBoxWidth * 0.1, y: Math.max(leftEye[4]._y, leftEye[5]._y) + 0.6 * leftEyeBoxHeight, w: 1.2 * leftEyeBoxWidth, h: 1.2 * leftEyeBoxHeight };
                    let rightDarkCircleBox = { x: rightEye[0]._x - rightEyeBoxWidth * 0.1, y: Math.max(rightEye[4]._y, rightEye[5]._y) + 0.6 * rightEyeBoxHeight, w: 1.2 * rightEyeBoxWidth, h: 1.2 * rightEyeBoxHeight };


                    fmcDrawWhiteEllipseInRectOnCanvas(leftDarkCircleBox.x, leftDarkCircleBox.y, leftDarkCircleBox.w, leftDarkCircleBox.h, "fmc_dark_circles_canvas");
                    fmcDrawWhiteEllipseInRectOnCanvas(rightDarkCircleBox.x, rightDarkCircleBox.y, rightDarkCircleBox.w, rightDarkCircleBox.h, "fmc_dark_circles_canvas");

                    let imgUrl = canvas.toDataURL("image/jpeg");
                    //console.log("DARK CIRCLES URL: ", imgUrl);

                    //canvas.style.opacity = 1;


                    resolve(imgUrl);

                })


            })
                .catch((e) => {
                    console.log("cannot create new dark circles mask - using original");
                    let imgUrl = canvas.toDataURL("image/jpeg");

                    resolve(imgUrl);
                })




        } catch (err) {
            console.log("DARK CIRCLES URL: ", err);
            reject(err);
        }
    })
}

export function fmcUpdateMaskOverlays() {
    if (fmcDehydrImgUrl == "" || fmcRednessImgUrl == "" || fmcDarkCircImgUrl == "") {

        let origImage = new Image();
        origImage.crossOrigin = "anonymous";

        origImage.onload = () => {
            let canvas = document.getElementById("fmc_dehydration_canvas");
            let ctx = canvas.getContext("2d");
            let red_canvas = document.getElementById("fmc_redness_canvas");
            let red_ctx = red_canvas.getContext("2d");
            let dark_cir_canvas = document.getElementById("fmc_dark_circles_canvas");
            let dark_cir_ctx = dark_cir_canvas.getContext("2d");
            canvas.width = origImage.naturalWidth;
            canvas.height = origImage.naturalHeight;
            red_canvas.width = origImage.naturalWidth;
            red_canvas.height = origImage.naturalHeight;
            dark_cir_canvas.width = origImage.naturalWidth;
            dark_cir_canvas.height = origImage.naturalHeight;



            ctx.drawImage(origImage, 0, 0, canvas.width, canvas.height);
            red_ctx.drawImage(origImage, 0, 0, red_canvas.width, red_canvas.height);
            dark_cir_ctx.drawImage(origImage, 0, 0, dark_cir_canvas.width, dark_cir_canvas.height);

            console.log("MASK OVERLAYS - IMAGE LOADED");

            let maskInterval = setInterval(() => {
                clearInterval(maskInterval);
                fmcMakeDehydrationMaskImageURL()
                    .then((imgUrl) => {
                        if (window.facemap != undefined) {
                            window.facemap.concerns.forEach((concern, index) => {
                                if (concern.name == "dehydration") {
                                    window.facemap.concerns[index].image = imgUrl;
                                }
                            })
                            window.facemap.sortedConcerns.forEach((concern, index) => {
                                if (concern.name == "dehydration") {
                                    window.facemap.sortedConcerns[index].image = imgUrl;
                                }
                            })
                            try {
                                document.getElementById("fmc_result_overlay_image_dehydration").style.backgroundImage = 'url(' + imgUrl + ')';
                            } catch (err) { }
                            try {
                                document.querySelectorAll("#fmcCarousel_mobileResults_dehydration .fmc_mobile_results_image").forEach((imgEl) => {
                                    imgEl.style.backgroundImage = 'url(' + imgUrl + ')';
                                })
                            } catch (err) { }


                            let rednessImgCheckInterval = setInterval(() => {

                                if (fmcRednessImgUrl != "") {

                                    window.facemap.concerns.forEach((concern, index) => {
                                        if (concern.name == "redness") {
                                            window.facemap.concerns[index].image = fmcRednessImgUrl;
                                        }
                                    })
                                    window.facemap.sortedConcerns.forEach((concern, index) => {
                                        if (concern.name == "redness") {
                                            window.facemap.sortedConcerns[index].image = fmcRednessImgUrl;
                                        }
                                    })
                                    try {
                                        document.getElementById("fmc_result_overlay_image_redness").style.backgroundImage = 'url(' + fmcRednessImgUrl + ')';
                                    } catch (err) { }
                                    try {
                                        document.querySelectorAll("#fmcCarousel_mobileResults_redness .fmc_mobile_results_image").forEach((imgEl) => {
                                            imgEl.style.backgroundImage = 'url(' + fmcRednessImgUrl + ')';
                                        })

                                    } catch (err) { }
                                    clearInterval(rednessImgCheckInterval);
                                }
                            }, 100);

                        }
                    })
                    .catch((err) => {
                        console.log("error in dehydration mask - ", err);
                    });

                fmcMakeDarkCirclesMaskImageURL("fmc_dark_circles_canvas")
                    .then((imgUrl) => {
                        if (window.facemap != undefined) {
                            window.facemap.concerns.forEach((concern, index) => {
                                if (concern.name == "dark_circles") {
                                    window.facemap.concerns[index].image = imgUrl;
                                }
                            })
                            window.facemap.sortedConcerns.forEach((concern, index) => {
                                if (concern.name == "dark_circles") {
                                    window.facemap.sortedConcerns[index].image = imgUrl;
                                }
                            })
                            try {
                                document.getElementById("fmc_result_overlay_image_dark_circles").style.backgroundImage = 'url(' + imgUrl + ')';
                            } catch (err) { }
                            try {
                                document.querySelectorAll("#fmcCarousel_mobileResults_dark_circles .fmc_mobile_results_image").forEach((imgEl) => {
                                    imgEl.style.backgroundImage = 'url(' + imgUrl + ')';
                                })
                            } catch (err) { }
                        } else {
                            // parsedResponse.facemap.concerns[index].image = imgUrl;

                        }
                    })
                    .catch((err) => {
                        console.log("error in dark circle mask - ", err);
                    });

            }, 100)



        }
        origImage.src = window.facemap.original_image;

    }
}

export function showScreen(screenNumber) {
    let fmcBodyElement = document.getElementById('fmcBody');

    if (screenNumber == 5) {
        window.fmc_curPage = "resultPage";
    }
    if (screenNumber == 2) {
        fmcIsOnboardingScreen = true;
        document.getElementById("fmc_fullScreenToggleIcon").style.left = "10px";
        document.getElementById("fmc_fullScreenToggleIcon").style.right = "unset";
    } else {
        fmcIsOnboardingScreen = false;
        document.getElementById("fmc_fullScreenToggleIcon").style.left = "unset";
        document.getElementById("fmc_fullScreenToggleIcon").style.right = "10px";
    }
    if (screenNumber != 2 && fmcChatStatus == "online") {
        document.getElementById("fmc_fixed_chat_button").style.display = "block";
        fmcIsOnboardingScreen = false;
    }

    if (fmcBodyElement.offsetWidth > mobileWidth) {
        if (!window.fmc_isEmbed) {
            //document.getElementById("dmlfmcwgt_GlobalContainer").style.minHeight = window.innerHeight+"px";
            //document.getElementById("fmcBody").style.backgroundSize = "c";
        } else {
            //document.getElementById("fmc_screen1").style.marginTop = "20%";
        }
        if (screenNumber == 1) {
            let fmcBody = document.getElementById("fmcBody");
            document.getElementById("fmc_screen1").style.height = fmcBody.offsetHeight + "px";
            let analysisCont = document.getElementById("fmc_landing_analysis_container");
            let bodyWidth = fmcBody.offsetWidth;
            let bodyHeight = fmcBody.offsetHeight;

            let ratio = bodyHeight / bodyWidth;

            if (ratio >= 1600 / 2846) {
                analysisCont.style.top = "72.2%";
            } else {
                let newPerc = 1 - (bodyWidth * 1600 / 2846 * 0.274 / bodyHeight);
                analysisCont.style.top = newPerc * 100 + "%";
            }
            fmcBodyElement.classList.add('fmc-desktop-screen1-background');


        } else {
            fmcBodyElement.classList.add('fmc-desktop-screen2-background');
            fmcBodyElement.classList.remove('fmc-desktop-screen1-background');
        }
    } else {
        if (screenNumber == 1) {
            fmcBodyElement.classList.add('fmc-mobile-screen1-background');

            let fmcBody = document.getElementById("fmcBody");
            document.getElementById("fmc_screen1").style.height = fmcBody.offsetHeight + "px";
            let analysisCont = document.getElementById("fmc_landing_analysis_container");
            let bodyWidth = fmcBody.offsetWidth;
            let bodyHeight = fmcBody.offsetHeight;

            let ratio = bodyHeight / bodyWidth;

            if (ratio >= 1600 / 2846) {
                //analysisCont.style.top = "72.2%";
            } else {
                let newPerc = 1 - (bodyWidth * 1600 / 2846 * 0.274 / bodyHeight);
                //analysisCont.style.top = newPerc*100 + "%";
            }
        }
    }

    if (screenNumber != 1) {
        fmcBodyElement.classList.add('fmc-non-landing-bg');
    }

    var screens = document.querySelectorAll('.fmc_screen')
    for (let i = 0; i < screens.length; i++) {
        var screen = screens[i]
        let appPrefix = "fmc_";
        if (screen.id == appPrefix + "screen" + screenNumber) {
            screen.className = "fmc_screen"
        }
        else {
            screen.className = "fmc_screen fmc_invisible"
        }
    }
    if (screenNumber == 5) {
        try {
            document.getElementById("fmc_email_form_tag").setAttribute("action", window.fmc_backendToUse + "/fmc/sendUserEmail")
        } catch (err) {
            console.error("error in setting from action - ", err)
        }
        fmcUpdateMaskOverlays();
        if (fmc_showNavbar) {
            document.getElementById("fmc_nav_bar").style.display = "block";
        }

    } else {
        document.getElementById("fmcBody").style.paddingBottom = "0";
    }
}

export function scoreToSeverity(score) {
    let htmlString = "BLA";
    if (score > 3) {
        htmlString = '<span class="fmc-ind-word-critical fmc-ind-word">' + fmcSeverityWords.critical + '</span>'
    } else if (score > 1) {
        htmlString = '<span class="fmc-ind-word-moderate fmc-ind-word">' + fmcSeverityWords.moderate + '</span>'
    } else {
        htmlString = '<span class="fmc-ind-word"></span>'
    }
    return htmlString;
}

export function makeIndicatorBarStyle(concernScore) {

    let styleString = "";

    let color;

    switch (String(concernScore)) {
        case "5":
        case "4":
            color = "#da806e";
            break;
        case "3":
        case "2":
            color = "#e9c353";
            break;
        case "1":
            color = "#4caf50";
            break;
        default:
            color = "rgba(0,0,0,0)";

    }

    let width = Math.max(0.95 * ((Number(concernScore) - 1) * 20 + 10), 0.05);



    styleString += "position: absolute;";
    styleString += "top: 2px;";
    styleString += "width: " + width + "%;";
    styleString += "background-color: " + color + ";";
    styleString += "left: 1%;";
    styleString += "height: 4px;";

    return styleString;
}

export function updateConcerns() {
    return new Promise((resolve, reject) => {

        let concernContainer = document.getElementById("fmc_concern_items");
        let sortedConcerns = [...window.facemap.sortedConcerns]

        while (sortedConcerns.length > fmcMaxConcerns) {
            sortedConcerns.pop();
        }


        let htmlString = "";
        let imageArrayWrapper = document.getElementById("fmc_result_images_array_wrapper");
        sortedConcerns.forEach((concern, index) => {
            if (index == 0) {
                htmlString += '<div id="fmc_concern_' + concern.name + '" class="fmc-results-category selected" concern="' + concern.name + '" onclick="selectConcern(\'' + concern.name + '\')">';
            } else {
                htmlString += '<div id="fmc_concern_' + concern.name + '" class="fmc-results-category" concern="' + concern.name + '" onclick="selectConcern(\'' + concern.name + '\')">';
            }
            htmlString += '<div id="fmc_concern_side_marker_' + concern.name + '" class="fmc-results-side-marker"></div>';
            htmlString += '<div id="fmc_results_category_content_' + concern.name + '" class="fmc-results-category-content">';
            htmlString += '<div id="fmc_concern_title_' + concern.name + '" class="fmc-results-title">' + concern.name + '</div>';
            htmlString += '<div id="fmc_concern_indicator_word_' + concern.name + '" class="fmc-results-indicator-word">' + scoreToSeverity(concern.score) + '</div>';
            htmlString += '<div id="fmc_concern_text_wrapper_' + concern.name + '" class="fmc-concern-text-wrapper fmc-text-collapsed">';
            htmlString += '<div id="fmc_concern_text_' + concern.name + '" class="fmc-results-text">' + fmcConcernCopy[concern.name].text + ' <a href="javascript:lessConcernText(\'' + concern.name + '\');" class="fmc-concern-less-button">' + fmcMoreLessButtonsText.less + '</a></div>';
            htmlString += '<a href="javascript:moreConcernText(\'' + concern.name + '\');" class="fmc-concern-more-button">' + fmcMoreLessButtonsText.more + '</a>';
            htmlString += '</div>';
            htmlString += '<div id="fmc_concern_indicator_bar_' + concern.name + '" class="fmc-results-indicator-bar"><div style="' + makeIndicatorBarStyle(concern.score) + '"></div></div>';
            htmlString += '</div>';
            htmlString += '</div>';
            let resultImageDiv = document.createElement("div");
            resultImageDiv.classList.add("fmc_result_overlay_image");
            if (concern.image == undefined) {
                console.log(concern)
            }
            //console.log(concern.image)

            resultImageDiv.style.backgroundImage = "url(" + concern.image + ")";
            if (index == 0) {
                resultImageDiv.style.opacity = 1;
            } else {
                resultImageDiv.style.opacity = 0;
            }
            resultImageDiv.setAttribute("id", "fmc_result_overlay_image_" + concern.name);
            imageArrayWrapper.appendChild(resultImageDiv);
        });
        if (document.getElementById("fmcBody").offsetWidth <= 768) {
            htmlString += '<div id="fmc_concern_slider_slide_element" draggable="true" ondragstart="dragRecommendationsStartEvent(event);" ontouchstart="dragRecommendationsStartEvent(event);"></div>';
        }
        console.log('htmlString', htmlString)
        concernContainer.innerHTML = htmlString;
        sortedConcerns.forEach((concern, index) => {
            document.getElementById("fmc_results_category_content_" + concern.name).style.backgroundImage = 'url("https://facemapping.me/img/concerns/' + concern.name + '-icon.png")';
        });

        if (document.getElementById("fmcBody").offsetWidth <= 768) {
            let slideElement = document.getElementById("fmc_concern_slider_slide_element");
            let bodyWidth = document.getElementById("fmcBody").offsetWidth;
            let sliderWidth = document.getElementById("fmc_concern_items").offsetWidth;
            slideElement.style.width = bodyWidth + "px";
            slideElement.style.left = 0.5 * (sliderWidth - bodyWidth) + "px";
        }



        // updateProductRecommendations()
        //     .then((updateProdRecRes) => {
        //         logOnLocalHostFrontEnd("UPDATE PROD RECOMMEND RES: ", updateProdRecRes);
        //         resolve("update concerns done");
        //     })
        //     .catch((updateProdRecErr) => {
        //         console.error("Error in update product recommendations - ", updateProdRecErr);
        //         resolve("update concerns done");
        //     })
    });

}

export function carouselNextProduct() {
    if (carouselSliderAllowsMoving) {

        let shopButtonText;
        if (window.fmc_productDict.button_text == "shop") {
            shopButtonText = fmcProductCards.shop_button;
        } else {
            shopButtonText = window.fmc_productDict.button_text;
        }

        carouselSliderAllowsMoving = false;
        let prodSection = document.getElementById("fmc_product_carousel_section");

        if (document.getElementById("fmcBody").offsetWidth > 768) {

            let secWidth = prodSection.offsetWidth;
            let prodWidth = 0.28 * secWidth;
            let gapWidth = 0.053 * secWidth;
            let activeLeft = 0.5 * gapWidth + prodWidth + 0.033 * secWidth;
            let activeWidth = 0.32 * secWidth;

            let recDivs = document.querySelectorAll("#fmc_product_carousel_section .fmc-product-container");

            let leftBorder = 0;

            recDivs.forEach((prodElement, index) => {

                prodElement.removeEventListener("click", carouselPrevProduct);
                prodElement.removeEventListener("click", carouselNextProduct);
                prodElement.style.cursor = "auto";

                let curPos = Number(prodElement.style.left.replace("px", ""));

                if (curPos > prodWidth && curPos < 2 * prodWidth) {
                    prodElement.style.width = prodWidth + "px";
                    if (window.fmc_showShopButton) {
                        if (window.fmc_showPrices) {
                            prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<p class="fmc-product-price">' + prodElement.getAttribute("price") + '</p>';
                        } else {
                            prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<p class="fmc-product-price"></p>';
                        }
                    }
                    prodElement.style.left = 0.5 * gapWidth + "px";
                    prodElement.style.top = "50px";
                    prodElement.style.boxShadow = "0px 5px 14px #d4d3d3";
                    prodElement.addEventListener("click", carouselPrevProduct);
                    prodElement.style.cursor = "pointer";
                } else if (curPos > 2 * prodWidth && curPos < 3 * prodWidth) {
                    prodElement.style.left = activeLeft + "px";
                    prodElement.style.width = activeWidth + "px";
                    prodElement.style.top = "30px";
                    prodElement.style.boxShadow = "0px 5px 50px #b8d8f4";
                    let prodUrl = prodElement.getAttribute("produrl");
                    if (window.fmc_showShopButton) {

                        //let fmcGAString = "fmcSendGA('main flow','shop button clicked - dermID-"+ prodElement.getAttribute("derm_id") + "'); return true;";
                        let fmcGAString = "triggerGaEventShopButton(" + prodElement.getAttribute("derm_id") + "); return true;";

                        if (prodUrl.substring(0, 7) == "http://" || prodUrl.substring(0, 7) == "https:/") {
                            if (window.fmc_showPrices) {
                                prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<a onclick="' + fmcGAString + '" class="fmc-product-buy-button" href="' + prodUrl + '" target="_blank"><p class="fmc-product-price">' + prodElement.getAttribute("price") + ' | ' + shopButtonText + ' <!--span class="fmc-arrow-icon fmc-arrow-right fmc-arrow-icon-white"></span--></p></a>';
                            } else {
                                prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<a onclick="' + fmcGAString + '" class="fmc-product-buy-button" href="' + prodUrl + '" target="_blank"><p class="fmc-product-price">' + shopButtonText + '</p></a>';
                            }
                        } else {
                            prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<a class="fmc-product-buy-button" onclick="' + prodUrl + '"><p class="fmc-product-price">' + prodElement.getAttribute("price") + ' | ' + shopButtonText + ' <!--span class="fmc-arrow-icon fmc-arrow-right fmc-arrow-icon-white"></span--></p></a>';
                        }
                    }

                } else {

                    if (curPos > 3 * prodWidth) {
                        prodElement.addEventListener("click", carouselNextProduct);
                        prodElement.style.cursor = "pointer";
                    }

                    if (curPos < leftBorder) {
                        let formerTransitionString = getComputedStyle(prodElement).transition;
                        prodElement.style.transition = "none";
                        curPos = 0.5 * gapWidth + (prodWidth + gapWidth) * (recDivs.length - 1);
                        prodElement.style.left = curPos + "px";
                        setTimeout(() => {
                            prodElement.style.transition = formerTransitionString;
                        }, 10)
                    }

                    prodElement.style.left = curPos - gapWidth - prodWidth + "px";
                }


                if (index == 0) {
                    setTimeout(() => {
                        carouselSliderAllowsMoving = true;
                    }, 520);
                }

            })
        } else {
            let secWidth = document.getElementById("fmc_product_carousel_slider").offsetWidth;
            let prodWidth = 0.8 * secWidth;
            let startValue = 0.1 * secWidth;
            let gapWidth = 0.05 * secWidth;
            let activeLeft = startValue;
            let activeWidth = prodWidth;

            let recDivs = document.querySelectorAll("#fmc_product_carousel_section .fmc-product-container");

            let leftBorder = 0;

            recDivs.forEach((prodElement, index) => {

                prodElement.removeEventListener("click", carouselPrevProduct);
                prodElement.removeEventListener("click", carouselNextProduct);

                let rightBorder = 2 * (prodWidth + gapWidth);


                let curPos = Number(prodElement.style.left.replace("px", ""));

                prodElement.style.left = curPos + gapWidth + prodWidth + "px";


                if (curPos > rightBorder) {
                    let formerTransitionString = getComputedStyle(prodElement).transition;
                    prodElement.style.transition = "none";
                    curPos = startValue - (prodWidth + gapWidth) * (recDivs.length - 3);
                    prodElement.style.left = curPos + "px";
                    setTimeout(() => {
                        prodElement.style.transition = formerTransitionString;
                    }, 10)
                    setTimeout(() => {
                        carouselSliderAllowsMoving = true;
                    }, 500);
                }
            })

        }
    }
}

export function carouselPrevProduct() {
    if (carouselSliderAllowsMoving) {

        let shopButtonText;
        if (window.fmc_productDict.button_text == "shop") {
            shopButtonText = fmcProductCards.shop_button;
        } else {
            shopButtonText = window.fmc_productDict.button_text;
        }

        carouselSliderAllowsMoving = false;

        let prodSection = document.getElementById("fmc_product_carousel_section");

        if (document.getElementById("fmcBody").offsetWidth > 768) {
            let secWidth = prodSection.offsetWidth;
            let prodWidth = 0.28 * secWidth;
            let gapWidth = 0.053 * secWidth;
            let activeLeft = 0.5 * gapWidth + prodWidth + 0.033 * secWidth;
            let activeWidth = 0.32 * secWidth;

            let recDivs = document.querySelectorAll("#fmc_product_carousel_section .fmc-product-container");

            let rightBorder = (prodWidth + gapWidth) * (recDivs.length - 2);

            recDivs.forEach((prodElement, index) => {
                prodElement.removeEventListener("click", carouselPrevProduct);
                prodElement.removeEventListener("click", carouselNextProduct);
                prodElement.style.cursor = "auto";

                let curPos = Number(prodElement.style.left.replace("px", ""));


                if (curPos > prodWidth && curPos < 2 * prodWidth) {
                    prodElement.style.width = prodWidth + "px";
                    if (window.fmc_showShopButton) {
                        if (window.fmc_showPrices) {
                            prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<p class="fmc-product-price">' + prodElement.getAttribute("price") + '</p>';
                        } else {
                            prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<p class="fmc-product-price"></p>';
                        }
                    }
                    prodElement.style.left = 2.5 * gapWidth + 2 * prodWidth + "px";
                    prodElement.style.top = "50px";
                    prodElement.style.boxShadow = "0px 5px 14px #d4d3d3";
                    prodElement.addEventListener("click", carouselNextProduct);
                    prodElement.style.cursor = "pointer";
                } else if (curPos > 0 && curPos < prodWidth) {
                    curPos = 1.5 * gapWidth + prodWidth;
                    prodElement.style.left = activeLeft + "px";
                    prodElement.style.width = activeWidth + "px";
                    prodElement.style.top = "30px";
                    prodElement.style.boxShadow = "0px 5px 50px #b8d8f4";
                    let prodUrl = prodElement.getAttribute("produrl");
                    if (window.fmc_showShopButton) {

                        if (prodUrl.substring(0, 7) == "http://" || prodUrl.substring(0, 7) == "https:/") {

                            //let fmcGAString = "fmcSendGA('main flow','shop button clicked - dermID-"+ prodElement.getAttribute("derm_id")+ "'); return true;";
                            let fmcGAString = "triggerGaEventShopButton(" + prodElement.getAttribute("derm_id") + "); return true;";

                            if (window.fmc_showPrices) {
                                prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<a onclick="' + fmcGAString + '" class="fmc-product-buy-button" href="' + prodUrl + '" target="_blank"><p class="fmc-product-price">' + prodElement.getAttribute("price") + ' | ' + shopButtonText + ' <!--span class="fmc-arrow-icon fmc-arrow-right fmc-arrow-icon-white"></span--></p></a>';
                            } else {
                                prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<a onclick="' + fmcGAString + '" class="fmc-product-buy-button" href="' + prodUrl + '" target="_blank"><p class="fmc-product-price">' + shopButtonText + '</p></a>';
                            }
                        } else {
                            if (window.fmc_showPrices) {
                                prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<a class="fmc-product-buy-button" onclick="' + prodUrl + '"><p class="fmc-product-price">' + prodElement.getAttribute("price") + ' | ' + shopButtonText + ' <!--span class="fmc-arrow-icon fmc-arrow-right fmc-arrow-icon-white"></span--></p></a>';
                            } else {
                                prodElement.querySelector(".fmc-product-price-wrapper").innerHTML = '<a class="fmc-product-buy-button" onclick="' + prodUrl + '"><p class="fmc-product-price">' + shopButtonText + '</p></a>';
                            }
                        }
                    }
                } else {

                    if (curPos < 0) {
                        prodElement.addEventListener("click", carouselPrevProduct);
                        prodElement.style.cursor = "pointer";
                    }

                    if (curPos > rightBorder) {
                        let formerTransitionString = getComputedStyle(prodElement).transition;
                        prodElement.style.transition = "none";
                        prodElement.style.left = -0.5 * gapWidth - prodWidth + "px";
                        setTimeout(() => {
                            prodElement.style.transition = formerTransitionString;
                        }, 10)
                    } else {
                        prodElement.style.left = curPos + gapWidth + prodWidth + "px";
                    }
                }


                if (index == 0) {
                    setTimeout(() => {
                        carouselSliderAllowsMoving = true;
                    }, 520);
                }

            })

        } else {
            let secWidth = document.getElementById("fmc_product_carousel_slider").offsetWidth;
            let prodWidth = 0.8 * secWidth;
            let startValue = 0.1 * secWidth;
            let gapWidth = 0.05 * secWidth;
            let activeLeft = startValue;
            let activeWidth = prodWidth;

            let recDivs = document.querySelectorAll("#fmc_product_carousel_section .fmc-product-container");

            let leftBorder = - (prodWidth + gapWidth) * (recDivs.length - 3) + startValue + 0.5 * gapWidth;

            recDivs.forEach((prodElement, index) => {

                let curPos = Number(prodElement.style.left.replace("px", ""));


                if (curPos < leftBorder) {
                    let formerTransitionString = getComputedStyle(prodElement).transition;
                    prodElement.style.transition = "none";
                    curPos = startValue + (prodWidth + gapWidth) * 3;
                    prodElement.style.left = curPos + "px";
                    setTimeout(() => {
                        prodElement.style.transition = formerTransitionString;
                    }, 10)
                    setTimeout(() => {
                        carouselSliderAllowsMoving = true;
                    }, 500);
                }


                prodElement.style.left = curPos - gapWidth - prodWidth + "px";
            })
        }


    }
}

export function updateProductCarousel() {
    return new Promise((resolve, reject) => {

        let recommendations = window.facemap.recommendedProducts;


        if (fmcRegimeLabels.soothe == undefined) {
            fmcRegimeLabels.soothe = fmcRegimeLabels.exfoliate;
        }

        let shopButtonText;
        if (window.fmc_productDict.button_text == "shop") {
            shopButtonText = fmcProductCards.shop_button;
        } else {
            shopButtonText = window.fmc_productDict.button_text;
        }

        while (recommendations.length > 6) {
            recommendations.pop();
        }
        if (recommendations.length > 5) {

            let prodSection = document.getElementById("fmc_product_carousel_section");
            if (document.getElementById("fmcBody").offsetWidth > 768) {

                let secWidth = prodSection.offsetWidth;
                let prodWidth = 0.28 * secWidth;
                let gapWidth = 0.053 * secWidth;
                let activeLeft = 0.5 * gapWidth + prodWidth + 0.033 * secWidth;
                let activeWidth = 0.32 * secWidth;
                recommendations.forEach((recommendation, index) => {
                    let newDiv = document.createElement("div");
                    newDiv.classList.add('fmc-product-container');
                    newDiv.style.width = prodWidth + "px";
                    if (index == recommendations.length - 1) {
                        newDiv.style.left = - 0.5 * gapWidth - prodWidth + "px";
                    } else {
                        newDiv.style.left = 0.5 * gapWidth + (prodWidth + gapWidth) * index + "px";
                    }

                    newDiv.setAttribute("prodUrl", recommendation.productUrl);
                    if (recommendation.priceCurrency == "") {
                        newDiv.setAttribute("price", "");
                    } else {
                        newDiv.setAttribute("price", recommendation.priceCurrency + recommendation.price);
                    }
                    newDiv.setAttribute("derm_id", recommendation.demandware_id);

                    let regimenIndex;
                    if (recommendation.regimen_index) {
                        regimenIndex = recommendation.regimen_index - 1;
                    } else {
                        regimenIndex = index;
                    }

                    let htmlString = "";
                    htmlString += '<div class="fmc-regime-marker"><p>' + (regimenIndex + 1) + '</p></div>';
                    if (recommendation.pimcore_id == "9211") {
                        htmlString += '<p class="fmc-regime-label">' + fmcRegimeLabels.soothe + '</p>';
                    } else {
                        htmlString += '<p class="fmc-regime-label">' + fmcRegimeLabels[fmcRegimeLabelsOrder[regimenIndex]] + '</p>';
                    }
                    htmlString += '<div class="fmc-product-image"><img src="' + recommendation.imageUrl + '"/></div>';
                    htmlString += '<p class="fmc-product-name">' + recommendation.name + '</p>';
                    htmlString += '<p class="fmc-product-subtitle">' + recommendation.tagline + '</p>';

                    if (index == 1) {
                        newDiv.style.width = activeWidth + "px";
                        newDiv.style.left = activeLeft + "px";
                        newDiv.style.top = "30px";
                        newDiv.style.boxShadow = "0px 5px 50px #b8d8f4";

                        if (window.fmc_showShopButton) {

                            //let fmcGAString = "fmcSendGA('main flow','shop button clicked - dermID-"+ recommendation.demandware_id+ "'); return true;";
                            let fmcGAString = "triggerGaEventShopButton(" + recommendation.demandware_id + "); return true;";

                            if (recommendation.productUrl.substring(0, 7) == "http://" || recommendation.productUrl.substring(0, 7) == "https:/") {
                                if (window.fmc_showPrices) {
                                    htmlString += '<div class="fmc-product-price-wrapper"><a onclick="' + fmcGAString + '" class="fmc-product-buy-button" href="' + recommendation.productUrl + '" target="_blank"><p class="fmc-product-price">' + shopButtonText + '<span class="fmc_price_separator"> | </span>' + recommendation.priceCurrency + recommendation.price + '</p></a></div>';
                                } else {
                                    htmlString += '<div class="fmc-product-price-wrapper"><a onclick="' + fmcGAString + '" class="fmc-product-buy-button" href="' + recommendation.productUrl + '" target="_blank"><p class="fmc-product-price">' + shopButtonText + '</p></a></div>';
                                }
                            } else {
                                if (window.fmc_showPrices) {
                                    htmlString += '<div class="fmc-product-price-wrapper"><a class="fmc-product-buy-button" onclick="' + recommendation.productUrl + '"><p class="fmc-product-price">' + shopButtonText + '<span class="fmc_price_separator"> | </span>' + recommendation.priceCurrency + recommendation.price + '</p></a></div>';
                                } else {
                                    htmlString += '<div class="fmc-product-price-wrapper"><a class="fmc-product-buy-button" onclick="' + recommendation.productUrl + '"><p class="fmc-product-price">' + shopButtonText + '</p></a></div>';
                                }
                            }
                        }
                    } else {
                        if (window.fmc_showShopButton) {
                            if (window.fmc_showPrices) {
                                htmlString += '<div class="fmc-product-price-wrapper"><p class="fmc-product-price">' + recommendation.priceCurrency + recommendation.price + '</p></div>';
                            } else {
                                htmlString += '<div class="fmc-product-price-wrapper"><p class="fmc-product-price"></p></div>';
                            }
                        }
                    }

                    if (index == 2) {
                        newDiv.addEventListener("click", carouselNextProduct);
                        newDiv.style.cursor = "pointer";
                    }
                    if (index == 0) {
                        newDiv.addEventListener("click", carouselPrevProduct);
                        newDiv.style.cursor = "pointer";
                    }

                    newDiv.innerHTML = htmlString;
                    prodSection.appendChild(newDiv);
                });
                fmcProductCarouselDone = true;

            } else {
                let secWidth = document.getElementById("fmc_product_carousel_slider").offsetWidth;
                let prodWidth = 0.8 * secWidth;
                let startValue = 0.1 * secWidth;
                let gapWidth = 0.05 * secWidth;
                let activeLeft = startValue;
                let activeWidth = prodWidth;


                recommendations.forEach((recommendation, index) => {
                    let newDiv = document.createElement("div");
                    newDiv.classList.add('fmc-product-container');
                    newDiv.style.width = prodWidth + "px";

                    let leftPos = startValue + (prodWidth + gapWidth) * index;

                    if (index > 2) {
                        leftPos = leftPos - (prodWidth + gapWidth) * 6;
                    }

                    newDiv.style.left = leftPos + "px";

                    newDiv.setAttribute("prodUrl", recommendation.productUrl);
                    if (window.fmc_showShopButton) {
                        if (window.fmc_showPrices) {
                            newDiv.setAttribute("price", recommendation.priceCurrency + recommendation.price);
                        } else {
                            newDiv.setAttribute("price", "");
                        }
                    }
                    newDiv.setAttribute("derm_id", recommendation.demandware_id);

                    let regimenIndex;
                    if (recommendation.regimen_index) {
                        regimenIndex = recommendation.regimen_index - 1;
                    } else {
                        regimenIndex = index;
                    }


                    let htmlString = "";
                    htmlString += '<div class="fmc-regime-marker"><p>' + (regimenIndex + 1) + '</p></div>';
                    if (recommendation.pimcore_id == "9211") {
                        htmlString += '<p class="fmc-regime-label">' + fmcRegimeLabels.soothe + '</p>';
                    } else {
                        htmlString += '<p class="fmc-regime-label">' + fmcRegimeLabels[fmcRegimeLabelsOrder[regimenIndex]] + '</p>';
                    }
                    htmlString += '<div class="fmc-product-image"><img src="' + recommendation.imageUrl + '"/></div>';
                    htmlString += '<p class="fmc-product-name">' + recommendation.name + '</p>';
                    htmlString += '<p class="fmc-product-subtitle">' + recommendation.tagline + '</p>';

                    if (window.fmc_showShopButton) {

                        //let fmcGAString = "fmcSendGA('main flow','shop button clicked - dermID-"+ recommendation.demandware_id+ "'); return true;";
                        let fmcGAString = "triggerGaEventShopButton(" + recommendation.demandware_id + "); return true;";

                        if (recommendation.productUrl.substring(0, 7) == "http://" || recommendation.productUrl.substring(0, 7) == "https:/") {
                            if (window.fmc_showPrices) {
                                htmlString += '<div class="fmc-product-price-wrapper"><a onclick="' + fmcGAString + '" class="fmc-product-buy-button" href="' + recommendation.productUrl + '" target="_blank"><p class="fmc-product-price">' + shopButtonText + '<span class="fmc_price_separator"> | </span>' + recommendation.priceCurrency + recommendation.price + '</p></a></div>';
                            } else {
                                htmlString += '<div class="fmc-product-price-wrapper"><a onclick="' + fmcGAString + '" class="fmc-product-buy-button" href="' + recommendation.productUrl + '" target="_blank"><p class="fmc-product-price">' + shopButtonText + '</p></a></div>';
                            }
                        } else {
                            if (window.fmc_showPrices) {
                                htmlString += '<div class="fmc-product-price-wrapper"><a class="fmc-product-buy-button" onclick="' + recommendation.productUrl + '"><p class="fmc-product-price">' + shopButtonText + '<span class="fmc_price_separator"> | </span>' + recommendation.priceCurrency + recommendation.price + '</p></a></div>';
                            } else {
                                htmlString += '<div class="fmc-product-price-wrapper"><a class="fmc-product-buy-button" onclick="' + recommendation.productUrl + '"><p class="fmc-product-price">' + shopButtonText + '</p></a></div>';
                            }
                        }
                    }


                    newDiv.innerHTML = htmlString;
                    prodSection.appendChild(newDiv);
                });
                setTimeout(() => {
                    let dragElement = document.createElement("div");
                    let bodyWidth = document.getElementById("fmcBody").offsetWidth;
                    let sliderWidth = document.getElementById("fmc_product_carousel_slider").offsetWidth;

                    dragElement.style.width = bodyWidth + "px";
                    dragElement.style.height = document.getElementById("fmc_product_carousel_slider").offsetHeight * 0.6 + "px";
                    dragElement.style.position = "absolute";
                    dragElement.style.top = "30px";
                    dragElement.style.left = 0.5 * (sliderWidth - bodyWidth) + "px";
                    dragElement.setAttribute("draggable", "true");
                    dragElement.setAttribute("ondragstart", "dragRegimeStartEvent(event)");
                    dragElement.setAttribute("ontouchstart", "dragRegimeStartEvent(event)");
                    prodSection.appendChild(dragElement);
                    fmcProductCarouselDone = true;

                }, 100);

            }
        } else {
            document.getElementById("fmc_product_carousel_container").style.display = "none";
            fmcProductCarouselDone = true;
        }


        let mainConcernTries = 0;

        let updateMainConcern = () => {
            if (window.facemap.sortedConcerns != undefined) {
                if (window.facemap.sortedConcerns.length > 0) {
                    document.getElementById("fmc_carousel_concern_focus").innerHTML = fmcConcernCopy[window.facemap.sortedConcerns[0].name].title;
                }
            } else {
                if (mainConcernTries < 10) {
                    setTimeout(() => {
                        mainConcernTries += 1;
                        updateMainConcern();
                    }, 500);
                }
            }
        }

        updateMainConcern();

        resolve("6 step regimen updated")
    })

}

export function updateResults() {

    return new Promise((resolve, reject) => {

        fmcProductConcernsDone = false;
        fmcProductCarouselDone = false;
        pendingUpdateResultsCounter = 0


        updateConcerns()
            .then((concernRes) => {
                console.log("UPDATING CONCERN RESPONSE: ", concernRes);
                fmcProductConcernsDone = true;
            })
            .catch((concernErr) => {
                console.error("Error in updating concerns: ", concernErr);
                fmcProductConcernsDone = true;
            })

        updateProductCarousel()
            .then((carouselRes) => {
                console.log("UPDATING CAROUSEL RESPONSE: ", carouselRes);
                fmcProductCarouselDone = true;
            })
            .catch((carouselErr) => {
                console.error("Error in updating carousel: ", carouselErr);
                fmcProductCarouselDone = true;
            })

        // let pendingUpdateInterval = setInterval(() => {

        //     if (fmcProductCarouselDone && fmcProductConcernsDone) {
        //         if (window.intellimize) {
        //             console.log("page updated");
        //             document.getElementById("fmc_results_mobile_next_button").style.top = Math.round(document.getElementById("fmcCarousel_mobileResults").offsetHeight / 2 - 25) + "px";
        //             document.getElementById("fmc_results_mobile_prev_button").style.top = Math.round(document.getElementById("fmcCarousel_mobileResults").offsetHeight / 2 - 25) + "px";
        //             intellimize.activate();
        //         }
        //         clearInterval(pendingUpdateInterval);
        //         resolve("update results - done");
        //     }
        // }, 100);



    })

}

export function fmcBuildResultsPage(facemapObj) {
    return new Promise((resolve, reject) => {



        // document.getElementById("fmc_submit_form_hashid").value = facemapObj.hashid;

        // Put user image as background in results image container

        document.getElementById("fmcResultImageContainer").style.backgroundImage = 'url("' + facemapObj.original_image + '")';
        // document.getElementById("fmc_frozen_glass_image_part_results").style.backgroundImage = 'url("' + facemapObj.original_image + '")';
        document.getElementById("fmcBody").style.height = "auto";
        document.getElementById("dml_fmc_wrapper").style.height = "auto";
        document.getElementById("dml_fmc_wrapper").style.maxHeight = "none";
        document.getElementById("fmcBody").style.paddingBottom = "50px";
        if (fmcOS.indexOf("iOS") > -1) {
            document.getElementById("fmc_frozen_glass_share_button").classList.add("fmc-is-ios")
        }
        fmc_results_available = true;


        if (!window.fmc_showNavbar) {
            document.getElementById("fmc_nav_bar").style.display = "none";
        }

        if (!facemapObj.include_regimen_products) {
            document.getElementById("fmc_product_carousel_container").style.display = "none";
        }

        // updateStoreLocations();

        // fmcUpdateNavbar(facemapObj.links);


        // update email input and send fields according to "send" text length
        // let emailContWidth = document.getElementById("fmc_email_input_send_container").offsetWidth;
        // let emailButtonWidth = document.getElementById("fmc_email_submit_button").offsetWidth;
        // document.getElementById("fmc_submit_form_email").style.width = (emailContWidth - emailButtonWidth - 5) + "px";
        // document.getElementById("fmc_email_submit_button").style.width = emailButtonWidth + "px";

        updateResults()
            .then((updateResultsRes) => {
                console.log("UPDATE RESULTS RESPONSE: ", updateResultsRes);
                // fmcCustomizations.afterBuildResultsPageCall();
                resolve("done building results page");
            })
            .catch((updateResultsErr) => {
                console.error("Error at update results - ", updateResultsErr);
                resolve("done building results page");
            })

    })

}

export function analyzeImage(canvasId = "fmc_camera_canvas") {

    //document.getElementById(canvasId).style.opacity = 1;

    fmcCropToFace(canvasId)
        .then((canvasIdAfterCrop) => {
            console.log("face crop successful", canvasIdAfterCrop);
            fmcLimitImageSize(canvasIdAfterCrop)
                .then((canvasIdAfterLimit) => {
                    console.log("canvas Id before calc Concerns: ", canvasIdAfterLimit)

                    let finalImgUrl = document.getElementById(canvasIdAfterLimit).toDataURL("image/jpeg");
                    let canvas_score = document.getElementById(canvasIdAfterLimit);
                    let ctx_score = canvas_score.getContext("2d");

                    let concernImage = new Image();


                    concernImage.onload = () => {

                        ctx_score.drawImage(concernImage, 0, 0, canvas_score.width, canvas_score.height);

                        fmcCalcConcerns(canvasIdAfterLimit)
                            .then((res) => {
                                stopVideo = true
                                console.log("calculated concern scores: ", res.concerns);
                                calcDehydrScore = Number(res.concerns.dehydration);
                                calcDarkCircleScore = Number(res.concerns.dark_circles);
                                let plainImgUrl = document.getElementById(res.canvasId).toDataURL("image/jpeg");
                                let concerns = []
                                for (let key in res.concerns) {
                                    let obj = {
                                        name: key,
                                        score: res.concerns[key]
                                    }
                                    concerns.push(obj)
                                }
                                window.facemap = { original_image: plainImgUrl, concerns, sortedConcerns: concerns };
                                showScreen(5);
                                setTimeout(() => {
                                    fmcBuildResultsPage(window.facemap)
                                        .then((buildResultsRes) => {
                                            console.log("BUILD RESULTS RESPONSE: ", buildResultsRes);
                                        })
                                }, 1000)

                                // sendImageToBackend(plainImgUrl)
                                //     .then((fmcRes) => {

                                //         console.log("ANALYZE RESPONSE: ", fmcRes);

                                //         fmcBuildAndUpdateAfterFMCResult(fmcRes)

                                //     })
                                //     .catch((fmcErr) => {
                                //         console.error("error in sendImageToBackend call - ", fmcErr);
                                //     })

                            })
                            .catch((err) => {
                                console.log("error in calculate concerns - ", err);
                                let imgUrl = document.getElementById(canvasIdAfterLimit).toDataURL("image/jpeg");
                                showScreen(5);
                                setTimeout(() => {
                                    fmcBuildResultsPage(window.facemap)
                                        .then((buildResultsRes) => {
                                            console.log("BUILD RESULTS RESPONSE: ", buildResultsRes);
                                        })
                                }, 1000)

                                // sendImageToBackend(imgUrl)
                                //     .then((fmcRes) => {
                                //         console.log("ANALYZE RESPONSE: ", fmcRes);
                                //         fmcBuildAndUpdateAfterFMCResult(fmcRes)
                                //     })
                                //     .catch((fmcErr) => {
                                //         console.error("error in sendImageToBackend call - ", fmcErr);
                                //     });
                            })
                    }

                    concernImage.src = finalImgUrl;


                })
                .catch((err) => {
                    console.log("error in limiting image size - ", err);
                    let imgUrl = document.getElementById(canvasIdAfterCrop).toDataURL("image/jpeg");

                    // sendImageToBackend(imgUrl)
                    //     .then((fmcRes) => {
                    //         console.log("ANALYZE RESPONSE: ", fmcRes);
                    //         fmcBuildAndUpdateAfterFMCResult(fmcRes)
                    //     })
                    //     .catch((fmcErr) => {
                    //         console.log("error in sendImageToBackend call - ", fmcErr);
                    //     });
                })
        })
        .catch((err) => {
            console.log("error in croping face - ", err);
            let imgUrl = document.getElementById(canvasId).toDataURL("image/jpeg");

            // sendImageToBackend(imgUrl)
            //     .then((fmcRes) => {
            //         console.log("ANALYZE RESPONSE: ", fmcRes);
            //         fmcBuildAndUpdateAfterFMCResult(fmcRes)
            //     })
            //     .catch((fmcErr) => {
            //         console.log("error in sendImageToBackend call - ", fmcErr);
            //     });
        })
}

export function sendVideoCanvasImage() {
    let fmc_body = document.getElementById("fmc_body");
    let video = document.getElementById("fmcInputVideo");
    let canvas = document.getElementById("fmc_camera_canvas");
    fmcImageOrientation = 1;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    //canvas.setAttribute("width", video.videoWidth);
    //canvas.setAttribute("height", video.videoHeight);

    let ctx = canvas.getContext("2d");

    setTimeout(() => {

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        setTimeout(() => {

            let base64imgData = canvas.toDataURL("image/jpeg");
            fmc_alignImageOrientation(base64imgData)
                .then((imgData) => {
                    analyzeImage("fmc_camera_canvas");
                })
                .catch((err) => {
                    console.log("error in orientating image - using original");
                    // sendImageToBackend(base64imgData)
                    //     .then((fmcRes) => {
                    //         console.log("ANALYZE RESPONSE: ", fmcRes);
                    //         fmcBuildAndUpdateAfterFMCResult(fmcRes)
                    //     })
                    //     .catch((fmcErr) => {
                    //         console.log("error in sendImageToBackend call - ", fmcErr);
                    //     });
                })
        }, 10)
    }, 10)

}