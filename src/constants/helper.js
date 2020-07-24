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
let initalCaptureDelay;
let fmcManualCaptureFlag = false;
let lastOnPlayCallTimeout;
let lastCallTimeoutTimer = 5000;
let lastEyePosition = { _x: 0, _y: 0 };
let resultsCounter = 0;
var fmcImSz = {
    w: 0,
    h: 0
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
    console.log('i am called')
    clearTimeout(lastOnPlayCallTimeout);
    fmcManualCaptureFlag = false;
    lastOnPlayCallTimeout = setTimeout(() => {
        if (!imageSent) {
            console.log("face detection not working - switching to manual capture");
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
        console.log(faces)
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


                        let topY = Math.max(0, Math.round(detectionBox._y - 0.8 * detectionBox._height));
                        let bottomY = Math.min(Math.round(detectionBox._y + 1.5 * detectionBox._height), canvas.height);
                        let faceBoxHeight = bottomY - topY;


                        //let leftX = Math.max(0,Math.round(detectionBox._x - 0.5*(Math.max(faceBoxHeight,detectionBox._width) - detectionBox._width)));
                        //let rightX = Math.min(canvas.width,Math.round(detectionBox._x + 0.5*(Math.max(faceBoxHeight,detectionBox._width) + detectionBox._width)));

                        let leftX = Math.max(0, Math.round(detectionBox._x - 0.5 * detectionBox._width));
                        let rightX = Math.min(canvas.width, Math.round(detectionBox._x + 1.5 * detectionBox._width));

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


                    resolve({ concerns: { darkCircles: darkCircleScore, dehydration: "2" }, canvasId: canvasId });
                })
                    .catch((e) => {
                        console.log("error in face detection on calc scores")
                        resolve({ concerns: { darkCircles: "2", dehydration: "2" }, canvasId: canvasId });
                    })
            } catch (err) {
                reject(err);
            }
        }
    })
}

export function analyzeImage(canvasId = "fmc_camera_canvas") {

    //document.getElementById(canvasId).style.opacity = 1;

    fmcCropToFace(canvasId)
        .then((canvasIdAfterCrop) => {
            console.log("face crop successful");
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
                                console.log("calculated concern scores: ", res.concerns);
                                calcDehydrScore = Number(res.concerns.dehydration);
                                calcDarkCircleScore = Number(res.concerns.darkCircles);
                                let plainImgUrl = document.getElementById(res.canvasId).toDataURL("image/jpeg");

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