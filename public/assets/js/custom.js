// ******************* FIRST CALL *********************

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

let ovalInterval;
let imageSent = false;
var fmc_runStream = true;
let camFaceDirection = true;
let mediaStream;
let initalCaptureDelay;

async function run() {
    initalCaptureDelay = 0;
    imageSent = false;

    // load face detection and face landmark models
    try {

        // try to access users webcam and stream the images
        // to the video element

        navigator.mediaDevices.enumerateDevices()
            .then((deviceList) => {
                let videoDevices = [];
                deviceList.forEach((device, index) => {
                    if (device.kind == "videoinput" && !(/Virtual/g.test(device.label)) && !(/CamTwist/g.test(device.label))) {
                        videoDevices.push(device);
                    }
                })
                if (videoDevices.length > 1) {
                    const stream = navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: {
                                ideal: "user"
                            },
                            width: {
                                max: 1920
                            },
                            height: {
                                max: 1080
                            }
                        },
                        audio: false
                    });
                    stream.then((camStream) => {
                        // let fmcBodyWidth = document.getElementById("fmcBody").offsetWidth;
                        // let fmcBodyHeight = document.getElementById("fmcBody").offsetHeight;
                        // let camPageContainer = document.getElementById("fmc_camera_page_camera_container");

                        // if (fmcBodyWidth >= 768) {
                        //     let streamHeight = camStream.getVideoTracks()[0].getSettings().height;
                        //     let streamWidth = camStream.getVideoTracks()[0].getSettings().width;
                        //     camPageContainer.style.height = Math.floor(camPageContainer.offsetWidth / streamWidth * streamHeight) + "px";
                        // }

                        const videoEl = document.getElementById('fmcInputVideo');
                        videoEl.srcObject = camStream;
                        mediaStream = camStream;

                    }).catch((err) => {
                        console.log("error in loading the camera, showing upload feature - ", err);
                        document.getElementById("fmc_camera_access_container").style.display = "none";
                        document.getElementById("fmc_camera_denied_container").style.display = "block";
                        document.getElementById("fmc_image_delayed_upload_button").style.display = "none";
                        clearTimeout(onPlayDelayTimeout);
                    })

                } else if (videoDevices.length == 0) {
                    document.getElementById("fmc_camera_access_container").style.display = "none";
                    document.getElementById("fmc_camera_denied_container").style.display = "block";
                    document.getElementById("fmc_image_delayed_upload_button").style.display = "none";
                    clearTimeout(onPlayDelayTimeout);
                } else {
                    const stream = navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: {
                                ideal: "user"
                            },
                            width: {
                                max: 1920
                            },
                            height: {
                                max: 1080
                            }
                        },
                        audio: false
                    });
                    stream.then((camStream) => {
                        let fmcBodyWidth = document.getElementById("fmcBody").offsetWidth;
                        let fmcBodyHeight = document.getElementById("fmcBody").offsetHeight;
                        let camPageContainer = document.getElementById("fmc_camera_page_camera_container");

                        if (fmcBodyWidth >= 768) {
                            let streamHeight = camStream.getVideoTracks()[0].getSettings().height;
                            let streamWidth = camStream.getVideoTracks()[0].getSettings().width;
                            camPageContainer.style.height = Math.floor(camPageContainer.offsetWidth / streamWidth * streamHeight) + "px";
                        }

                        const videoEl = document.getElementById('fmcInputVideo');
                        videoEl.srcObject = camStream;
                        mediaStream = camStream;

                    }).catch((err) => {
                        console.log("error in loading the camera, showing upload feature - ", err);
                        document.getElementById("fmc_camera_access_container").style.display = "none";
                        document.getElementById("fmc_camera_denied_container").style.display = "block";
                        document.getElementById("fmc_image_delayed_upload_button").style.display = "none";
                        clearTimeout(onPlayDelayTimeout);
                    })
                }

            })
            .catch((err) => {
                console.log(err);
            })

    } catch (err) {
        console.log("error in loading the camera, showing upload feature - ", err);
        document.getElementById("fmc_camera_access_container").style.display = "none";
        document.getElementById("fmc_camera_denied_container").style.display = "block";
        document.getElementById("fmc_image_delayed_upload_button").style.display = "none";
        clearTimeout(onPlayDelayTimeout);
    }
}

const TINY_FACE_DETECTOR = 'tiny_face_detector'

let selectedFaceDetector = TINY_FACE_DETECTOR

// tiny_face_detector options
let inputSize = 256
let scoreThreshold = 0.5

function getFaceDetectorOptions() {
    return new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
}

function isFaceDetectionModelLoaded() {
    return !!faceapi.nets.tinyFaceDetector.params
}

async function changeFaceDetector(detector) {
    if (!isFaceDetectionModelLoaded()) {
        await faceapi.nets.tinyFaceDetector.load('/')
    }
}

// ******************* SECOND CALL *********************
let fmcManualCaptureFlag = false;
let lastOnPlayCallTimeout;
let lastCallTimeoutTimer = 5000;
async function onPlay() {
    clearTimeout(lastOnPlayCallTimeout);
    document.getElementById("fmc_camera_capture_action_button").style.display = "none";
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

    document.getElementById("fmc_image_delayed_upload_button").style.display = "none";
    clearTimeout(onPlayDelayTimeout);

    document.getElementById("fmc_loading_spinner").style.display = "none";
    document.getElementById("fmc_camera_page_camera_container").style.opacity = "1";

    const videoEl = document.getElementById('fmcInputVideo')

    let options = getFaceDetectorOptions()

    let faces;

    try {
        faces = await faceapi.detectAllFaces(videoEl, options).withFaceLandmarks()  //  either of them can be removed
        faceapi.detectAllFaces(videoEl, options).withFaceLandmarks() // either of them can be removed
            .then((detectFaceRes) => {
                faces = detectFaceRes;
            })
            .catch((faceDetectErr) => {
                console.log("problem in detecting face - ", faceDetectErr);
            })

    } catch (errorDetectFace) {
        console.error("error in detect face: ", errorDetectFace);
    }



    if (faces.length > 0) {
        console.error("face results - ", faces);
        if (faces.length > 1) {
            document.getElementById("fmc_camera_hint_message").innerHTML = fmcImageErrors.multi_face;
        } else {
            let result = faces[0];

            console.error("result - ", result);

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



                    //drawLandmarks(videoEl, document.getElementById('overlay'), [result], withBoxes)

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

    if (fmc_runStream) {
        setTimeout(() => { onPlay() }, 500);
    }

}


function checkFaceInImage(faceCoords, drawFromVideo = true) {
    return new Promise((resolve, reject) => {
        let landmarks = faceCoords.landmarks;
        let lightParameters = getFaceLightProperties(faceCoords.landmarks, drawFromVideo);

        console.error("light parameters: ", lightParameters);

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

		/*if (lightParameters.averageLight < 50 && allowHint){
			cameraHint = ""; // REMOVED !!!!
			allowHint = false;
		}*/

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