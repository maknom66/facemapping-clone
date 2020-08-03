import React, {
    Component,
    useEffect,
    useState,
    useRef,
    useCallback,
    useReducer,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { StyleSheet, css } from "aphrodite";
import * as faceapi from "face-api.js";
import * as helper from "../../constants/helper";
import * as constants from "../../constants/utils";
import EXIF from "exif-js";
import firebase from "firebase";

// VIDEO CALL IMPORTS
import DailyIframe from "@daily-co/daily-js";
import CallObjectContext from "../../constants/CallObjectContext";
import Call from "../../components/Call/Call";
import StartButton from "../../components/StartButton/StartButton";
import Tray from "../../components/Tray/Tray";
import { initialCallState, callReducer } from "../../components/Call/callState";

// STYLE
import "./Home.css";

// COMPONENTS IMPORT

// API CALL IMPORT
import * as ApiCall from "../../constants/ApiCall";

function Home(props) {
    // STATE
    const [appState, setAppState] = useState(constants.STATE_IDLE);
    const [callObject, setCallObject] = useState(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [currentStream, setCurrentStream] = useState(null);
    const [videoDims, setVideoDims] = useState(null);
    const [videoDetectionInterval, setDetectionInterval] = useState(null);
    const [mediaDevices, setMediaDevices] = useState([]);
    const [concerns, setConcerns] = useState([]);
    const [hostConcerns, setHostConcerns] = useState([]);
    const [shouldStopVideo, setStopVideo] = useState(false);
    const [roomName, setRoomName] = useState(null);
    const [roomUrl, setRoomUrl] = useState(null);
    const [callState, dispatch] = useReducer(callReducer, initialCallState);

    // CONSTANTS
    const showCall = [
        constants.STATE_JOINING,
        constants.STATE_JOINED,
        constants.STATE_ERROR,
    ].includes(appState);
    const enableCallButtons = [
        constants.STATE_JOINED,
        constants.STATE_ERROR,
    ].includes(appState);
    const enableStartButton = appState === constants.STATE_IDLE;

    // VARIABLE INITIALIZE
    let resultsCounter = 0;
    let initalCaptureDelay = 0;
    let lastEyePosition = { _x: 0, _y: 0 };
    let rdcpupImageOrientation;
    let rdcpupImSz = { w: 0, h: 0 };
    let counter = 0;
    let curImgData;
    let faceAIsawFace = false;
    let detectionInterval;

    // METHODS

    // LISTEN FOR HOST CHANGES
    const listenForChanges = (session_id) => {
        firebase
            .firestore()
            .collection("detection_data")
            .doc(`${roomName.replace(new RegExp(" ", "g"), "-")}-${session_id}`)
            .onSnapshot((obj) => {
                if (obj.data()) setHostConcerns(obj.data().concern);
            });
    };

    // CREATE ROOM
    const createRoom = async (roomName) => {
        let response = await fetch("https://api.daily.co/v1/rooms", {
            method: "post",
            headers: {
                "content-type": "application/json",
                authorization:
                    "Bearer a04df8223371456ae6a59c8ac9ce0a3e91d7c3bdf21d9857cc5850c16c8ec219",
            },
            body: JSON.stringify({
                name: roomName,
                properties: { max_participants: 2 },
            }),
        });
        response = await response.json();
        startJoiningCall(roomName);
    };

    // HANDLE CALL STATE CHANGE
    const handleVideoCallState = () => {
        if (!callObject) return;

        const events = ["joined-meeting", "left-meeting", "error"];
        function handleNewMeetingState(event) {
            switch (callObject.meetingState()) {
                case "joined-meeting":
                    setAppState(constants.STATE_JOINED);
                    break;
                case "left-meeting":
                    callObject.destroy().then(() => {
                        setCallObject(null);
                        setAppState(constants.STATE_IDLE);
                    });
                    break;
                case "error":
                    setAppState(constants.STATE_ERROR);
                    break;
                default:
                    break;
            }
        }

        // Use initial state
        handleNewMeetingState();

        // Listen for changes in state
        for (const event of events) {
            callObject.on(event, handleNewMeetingState);
        }

        // Stop listening for changes in state
        return function cleanup() {
            for (const event of events) {
                callObject.off(event, handleNewMeetingState);
            }
        };
    };

    // JOIN CALL
    const startJoiningCall = useCallback((roomName) => {
        if (!roomName) return;
        let url = `https://${process.env.REACT_APP_DEV_DAILY_SUBDOMAIN}.daily.co/${roomName}`;
        const callObject = DailyIframe.createCallObject();
        setRoomUrl(url);
        setCallObject(callObject);
        setAppState(constants.STATE_JOINING);
        callObject.join({ url });
    }, []);

    // LEAVE CALL
    const startLeavingCall = useCallback(() => {
        if (!callObject) return;
        setAppState(constants.STATE_LEAVING);
        callObject.leave();
    }, [callObject]);

    // START WITH LOADING MODEL AND PROCEED
    const initialize = async () => {
        if (await loadModels()) {
            detectionInterval = setInterval(() => {
                onplay();
            }, 500);
        }
    };

    // LOAD FACE API MODELS
    const loadModels = async () => {
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri("/assets/models");
            await faceapi.nets.faceLandmark68Net.loadFromUri("/assets/models");
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    };

    // ADJUST OVERLAY
    const adjustOvalSize = () => {
        let camContainerDiv = document.getElementById("inputVideo");
        document.getElementById("inputVideoOvalMask").style.height =
            camContainerDiv.offsetHeight + "px";
        let scaleFactor;
        if (camContainerDiv.offsetHeight > camContainerDiv.offsetWidth) {
            scaleFactor = Math.round(
                (camContainerDiv.offsetWidth / 600) * 1000
            );
        } else {
            scaleFactor = Math.round(
                (camContainerDiv.offsetHeight / 600) * 1000
            );
        }
        document.getElementById("inputVideoOvalMask").style.backgroundSize =
            scaleFactor + "px";
        document.getElementById("inputVideoOvalMask").style.opacity = 0.3;
        document.getElementById("detectionHint").style.opacity = 1;
    };

    // GET DETECTOR OPTIONS
    const getFaceDetectorOptions = () => {
        return new faceapi.TinyFaceDetectorOptions({
            inputSize: constants.inputSize,
            scoreThreshold: constants.scoreThreshold,
        });
    };

    // GET FACE LIGHT PROPERTIES
    const getFaceLightProperties = (landmarks, drawFromVideo = true) => {
        let video = document.getElementById("inputVideo");
        let canvas = document.getElementById("rdcpup_camera_canvas");

        let leftEyeBrow = landmarks.getLeftEyeBrow();
        let nose = landmarks.getNose();
        let jaw = landmarks.getJawOutline();

        let topLeft = {
            x: jaw[5]._x,
            y: leftEyeBrow[2]._y,
        };
        let bottomLeft = {
            x: jaw[5]._x,
            y: jaw[5]._y,
        };
        let topRight = {
            x: jaw[11]._x,
            y: leftEyeBrow[2]._y,
        };
        let bottomRight = {
            x: jaw[11]._x,
            y: jaw[5]._y,
        };
        let centerX = Math.round(0.5 * (jaw[11]._x + jaw[5]._x));

        let ctx = canvas.getContext("2d");

        if (drawFromVideo) {
            window.rdcpup_can_width = video.videoWidth;
            window.rdcpup_can_height = video.videoHeight;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        let leftSideImgData = ctx.getImageData(
            topLeft.x,
            topLeft.y,
            centerX - topLeft.x,
            bottomLeft.y - topLeft.y
        );
        let rightSideImgData = ctx.getImageData(
            centerX,
            topRight.y,
            topRight.x - centerX,
            bottomRight.y - topRight.y
        );

        let leftLight = 0;
        let rightLight = 0;

        for (let ii = 0; ii < leftSideImgData.data.length / 4; ii++) {
            leftLight +=
                0.2126 * leftSideImgData.data[4 * ii] +
                0.7152 * leftSideImgData.data[4 * ii + 1] +
                0.0722 * leftSideImgData.data[4 * ii + 2];
            rightLight +=
                0.2126 * rightSideImgData.data[4 * ii] +
                0.7152 * rightSideImgData.data[4 * ii + 1] +
                0.0722 * rightSideImgData.data[4 * ii + 2];
        }

        return {
            relativeLightDiff:
                Math.abs(leftLight - rightLight) /
                Math.max(leftLight, rightLight),
            averageLight:
                (0.5 * (leftLight + rightLight)) /
                (leftSideImgData.data.length / 4),
        };
    };

    // CHECK FACE IN IMAGE
    const checkFaceInImage = (faceCoords, drawFromVideo = true) => {
        let landmarks = faceCoords.landmarks;
        let lightParameters = getFaceLightProperties(
            faceCoords.landmarks,
            drawFromVideo
        );
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
            y: faceBox._y / imageDims._height,
        };

        let widthRatio = faceBox._width / imageDims._width;
        let eyesTilt =
            (leftEyePoint._y - rightEyePoint._y) /
            (leftEyePoint._x - rightEyePoint._x);
        let noseTurn =
            (noseTipPoint._x - noseStartPoint._x) /
            (noseTipPoint._y - noseStartPoint._y);
        let noseTilt = (noseTipPoint._y - faceBox._y) / faceBox._height;
        let allowHint = true;

        if (eyesTilt > 0.1) {
            cameraHint = constants.detectionDict.tiltedLeft;
            allowHint = false;
        } else if (eyesTilt < -0.1) {
            cameraHint = constants.detectionDict.tiltedRight;
            allowHint = false;
        }

        if (noseTilt < 0.45 && allowHint) {
            cameraHint = constants.detectionDict.tiltedUpwards;
            allowHint = false;
        } else if (noseTilt > 0.55 && allowHint) {
            cameraHint = constants.detectionDict.tiltedDownwards;
            allowHint = false;
        }

        if (noseTurn > 0.1 && allowHint) {
            cameraHint = constants.detectionDict.turnedLeft;
            allowHint = false;
        } else if (noseTurn < -0.1 && allowHint) {
            cameraHint = constants.detectionDict.turnedRight;
            allowHint = false;
        }

        if (widthRatio < widthRatioLimitLower && allowHint) {
            cameraHint = constants.detectionDict.tooFar;
            allowHint = false;
        } else if (widthRatio > widthRatioLimitUpper && allowHint) {
            cameraHint = constants.detectionDict.tooClose;
            allowHint = false;
        }

        if (relFaceBoxPos.x < xLimitLower && allowHint) {
            cameraHint = constants.detectionDict.tooFarRight;
            allowHint = false;
        } else if (relFaceBoxPos.x > xLimitUpper && allowHint) {
            cameraHint = constants.detectionDict.tooFarLeft;
            allowHint = false;
        }

        if (relFaceBoxPos.y < yLimitLower && allowHint) {
            cameraHint = constants.detectionDict.tooHigh;
            allowHint = false;
        } else if (relFaceBoxPos.y > yLimitUpper && allowHint) {
            cameraHint = constants.detectionDict.tooLow;
            allowHint = false;
        }

        if (lightParameters.relativeLightDiff > 0.4 && allowHint) {
            cameraHint = constants.detectionDict.unevenLight;
            allowHint = false;
        }

        if (allowHint) {
            cameraHint = constants.detectionDict.perfect;
        }

        return cameraHint;
    };

    const base64ToArrayBuffer = (base64) => {
        base64 = base64.replace(/^data\:([^\;]+)\;base64,/gim, "");
        let binaryString = atob(base64);
        let len = binaryString.length;
        let bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // ALIGN IMAGE ORIENTATION
    const orientImage = async (base64imageInput) => {
        return new Promise((resolve, reject) => {
            curImgData = base64imageInput;
            let exif = EXIF.readFromBinaryFile(
                base64ToArrayBuffer(base64imageInput)
            );

            let canvas = document.getElementById("rdcpup_camera_canvas");
            let ctx = canvas.getContext("2d");

            if (exif.Orientation == undefined) {
                rdcpupImageOrientation = 1;
            } else {
                rdcpupImageOrientation = exif.Orientation;
            }

            let tmpImage = new Image();
            tmpImage.onload = () => {
                rdcpupImSz = {
                    w: tmpImage.naturalWidth,
                    h: tmpImage.naturalHeight,
                };

                let imgHeight = tmpImage.height;
                let imgWidth = tmpImage.width;

                canvas.width = imgWidth;
                canvas.height = imgHeight;

                ctx.drawImage(tmpImage, 0, 0, imgWidth, imgHeight);

                if (constants.rdcpupManualCaptureFlag) {
                    reject(base64imageInput);
                } else {
                    let faceAiWorksFlag = false;
                    setTimeout(() => {
                        if (!faceAiWorksFlag) {
                            constants.rdcpupManualCaptureFlag = false;
                            reject(base64imageInput);
                        }
                    }, 5000);
                    try {
                        let options = getFaceDetectorOptions();
                        faceapi
                            .detectAllFaces(canvas, options)
                            .withFaceLandmarks()
                            .then((landmarkDataArray) => {
                                faceAiWorksFlag = true;
                                if (landmarkDataArray.length > 0) {
                                    faceAIsawFace = true;
                                    resolve(base64imageInput);
                                } else {
                                    try {
                                        if (
                                            rdcpupImageOrientation == 8 ||
                                            rdcpupImageOrientation == 1
                                        ) {
                                            canvas.width = imgHeight;
                                            canvas.height = imgWidth;
                                            ctx.rotate((-90 * Math.PI) / 180);
                                            ctx.drawImage(
                                                tmpImage,
                                                -imgWidth,
                                                0,
                                                imgWidth,
                                                imgHeight
                                            );
                                        } else if (
                                            rdcpupImageOrientation == 6
                                        ) {
                                            canvas.width = imgHeight;
                                            canvas.height = imgWidth;
                                            ctx.rotate((90 * Math.PI) / 180);
                                            ctx.drawImage(
                                                tmpImage,
                                                0,
                                                -imgHeight,
                                                imgWidth,
                                                imgHeight
                                            );
                                        } else if (
                                            rdcpupImageOrientation == 3
                                        ) {
                                            canvas.width = imgWidth;
                                            canvas.height = imgHeight;
                                            ctx.rotate(Math.PI);
                                            ctx.drawImage(
                                                tmpImage,
                                                -imgWidth,
                                                -imgHeight,
                                                imgWidth,
                                                imgHeight
                                            );
                                        } else {
                                            canvas.width = imgWidth;
                                            canvas.height = imgHeight;
                                            ctx.drawImage(
                                                tmpImage,
                                                0,
                                                0,
                                                imgWidth,
                                                imgHeight
                                            );
                                        }

                                        setTimeout(() => {
                                            faceapi
                                                .detectAllFaces(canvas, options)
                                                .withFaceLandmarks()
                                                .then((landmarkDataArray) => {
                                                    if (
                                                        landmarkDataArray.length >
                                                        0
                                                    ) {
                                                        faceAIsawFace = true;
                                                        let imgData = canvas.toDataURL(
                                                            "image/jpeg"
                                                        );
                                                        try {
                                                            ctx.resetTransform();
                                                        } catch (err) {
                                                            ctx.rotate(0);
                                                        }
                                                        curImgData = imgData;
                                                        resolve(imgData);
                                                    } else {
                                                        curImgData = base64imageInput;
                                                        reject(
                                                            base64imageInput
                                                        );
                                                    }
                                                });
                                        }, 10);
                                    } catch (loadErr) {
                                        console.log(
                                            "error in orientating BB image",
                                            loadErr
                                        );
                                        curImgData = base64imageInput;
                                        reject(base64imageInput);
                                    }
                                }
                            });
                    } catch (err) {
                        curImgData = base64imageInput;
                        reject(base64imageInput);
                    }
                }
            };
            try {
                tmpImage.src = base64imageInput;
            } catch (srcErr) {
                console.log("source error - ", srcErr);
                reject(base64imageInput);
            }
        });
    };

    // CROP IMAGE
    const rdcpupCropToFace = (canvasId = "rdcpup_camera_canvas") => {
        return new Promise((resolve, reject) => {
            let canvas = document.getElementById(canvasId);
            let ctx = canvas.getContext("2d");
            try {
                ctx.resetTransform();
            } catch (err) {
                ctx.rotate(0);
            }

            if (constants.rdcpupManualCaptureFlag) {
                resolve(canvasId);
            } else {
                let fallbackFlag = true;
                setTimeout(() => {
                    if (fallbackFlag) {
                        resolve(canvasId);
                    }
                }, 3000);

                let options = getFaceDetectorOptions();
                faceapi
                    .detectAllFaces(canvas, options)
                    .withFaceLandmarks()
                    .then((landmarkDataArray) => {
                        fallbackFlag = false;
                        if (landmarkDataArray.length == 1) {
                            landmarkDataArray.forEach((landmarkData, index) => {
                                let overlay = document.getElementById(
                                    "rdcpup_camera_canvas_overlay"
                                );
                                overlay.style.opacity = 1;
                                overlay.width = canvas.width;
                                overlay.height = canvas.height;

                                let detectionBox = landmarkData.detection._box;

                                let topY = Math.max(
                                    0,
                                    Math.round(
                                        detectionBox._y -
                                            0.3 * detectionBox._height
                                    )
                                );
                                let bottomY = Math.min(
                                    Math.round(
                                        detectionBox._y + detectionBox._height
                                    ),
                                    canvas.height
                                );
                                let faceBoxHeight = bottomY - topY;

                                let leftX = Math.max(
                                    0,
                                    Math.round(
                                        detectionBox._x +
                                            0.1 * detectionBox._width
                                    )
                                );
                                let rightX = Math.min(
                                    canvas.width,
                                    Math.round(
                                        detectionBox._x +
                                            0.95 * detectionBox._width
                                    )
                                );

                                let faceBoxData = {
                                    x: leftX,
                                    y: topY,
                                    w: rightX - leftX,
                                    h: bottomY - topY,
                                };

                                let faceImgData = ctx.getImageData(
                                    faceBoxData.x,
                                    faceBoxData.y,
                                    faceBoxData.w,
                                    faceBoxData.h
                                );

                                canvas.width = faceBoxData.w;
                                canvas.height = faceBoxData.h;

                                rdcpupImSz = {
                                    w: Math.round(faceBoxData.w),
                                    h: Math.round(faceBoxData.h),
                                };

                                ctx.clearRect(
                                    0,
                                    0,
                                    canvas.width,
                                    canvas.height
                                );
                                ctx.putImageData(faceImgData, 0, 0);
                                setTimeout(() => {
                                    resolve(canvasId);
                                }, 10);
                            });
                        } else {
                            resolve(canvasId);
                        }
                    })
                    .catch((e) => {
                        console.log(
                            "could not crop to face, sending full image",
                            e
                        );
                        resolve(canvasId);
                    });
            }
        });
    };

    // LIMIT IMAGE
    function rdcpupLimitImageSize(canvasId = "rdcpup_camera_canvas") {
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
                    let pixelLimit = 1920;
                    if (imgHeight > imgWidth) {
                        scaleFactor = Math.min(pixelLimit / imgHeight, 1);
                    } else {
                        scaleFactor = Math.min(pixelLimit / imgWidth, 1);
                    }

                    rdcpupImSz = {
                        w: Math.round(scaleFactor * imgWidth),
                        h: Math.round(scaleFactor * imgHeight),
                    };

                    canvas.width = Math.round(scaleFactor * imgWidth);
                    canvas.height = Math.round(scaleFactor * imgHeight);
                    setTimeout(() => {
                        ctx.drawImage(
                            unscaledImg,
                            0,
                            0,
                            Math.round(imgWidth * scaleFactor),
                            Math.round(imgHeight * scaleFactor)
                        );
                        setTimeout(() => {
                            resolve(canvasId);
                        }, 10);
                    }, 10);
                };
                unscaledImg.src = unscaledImgUrl;
            } else {
                resolve(canvasId);
            }
        });
    }

    // CALCULATE CONCERNS
    const rdcpupCalcConcerns = (canvasId = "rdcpup_camera_canvas") => {
        return new Promise((resolve, reject) => {
            if (constants.rdcpupManualCaptureFlag) {
                reject({
                    success: false,
                    message: "constants.rdcpupManualCaptureFlag is true",
                });
            } else {
                try {
                    let options = getFaceDetectorOptions();
                    let canvas = document.getElementById(canvasId);
                    let ctx = canvas.getContext("2d");
                    let overlay = document.getElementById(
                        "rdcpup_camera_canvas_overlay"
                    );
                    let overlayctx = overlay.getContext("2d");
                    overlay.width = canvas.width;
                    overlay.height = canvas.height;
                    faceapi
                        .detectAllFaces(canvas, options)
                        .withFaceLandmarks()
                        .then((landmarkDataArray) => {
                            let darkCircleScore = -1;
                            let dehydrationScore = -1;
                            landmarkDataArray.forEach((landmarkData, index) => {
                                let leftEye = [];
                                let rightEye = [];
                                let leftEyeBrow = [];
                                let rightEyeBrow = [];
                                let jaw = [];
                                let mouth = [];
                                let nose = [];
                                if (
                                    landmarkData.landmarks._shift._x >= 0 &&
                                    landmarkData.landmarks._shift._y >= 0
                                ) {
                                    leftEye = landmarkData.landmarks.getLeftEye();
                                    rightEye = landmarkData.landmarks.getRightEye();
                                    leftEyeBrow = landmarkData.landmarks.getLeftEyeBrow();
                                    rightEyeBrow = landmarkData.landmarks.getRightEyeBrow();
                                    jaw = landmarkData.landmarks.getJawOutline();
                                    mouth = landmarkData.landmarks.getMouth();
                                    nose = landmarkData.landmarks.getNose();
                                } else if (
                                    landmarkData.landmarks._shift._x < 0 &&
                                    landmarkData.landmarks._shift._y < 0
                                ) {
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
                                        shiftedLeftEye.forEach(
                                            (eyePoint, index) => {
                                                leftEye.push({
                                                    _x:
                                                        shiftedLeftEye[index]
                                                            ._x,
                                                    _y:
                                                        unshiftedLeftEye[index]
                                                            ._y,
                                                });
                                                rightEye.push({
                                                    _x:
                                                        shiftedRightEye[index]
                                                            ._x,
                                                    _y:
                                                        unshiftedRightEye[index]
                                                            ._y,
                                                });
                                            }
                                        );
                                        shiftedLeftEyeBrow.forEach(
                                            (eyeBrowPoint, index) => {
                                                leftEyeBrow.push({
                                                    _x:
                                                        shiftedLeftEyeBrow[
                                                            index
                                                        ]._x,
                                                    _y:
                                                        unshiftedLeftEyeBrow[
                                                            index
                                                        ]._y,
                                                });
                                                rightEyeBrow.push({
                                                    _x:
                                                        shiftedRightEyeBrow[
                                                            index
                                                        ]._x,
                                                    _y:
                                                        unshiftedRightEyeBrow[
                                                            index
                                                        ]._y,
                                                });
                                            }
                                        );
                                        shiftedJaw.forEach(
                                            (jawPoint, index) => {
                                                jaw.push({
                                                    _x: shiftedJaw[index]._x,
                                                    _y: unshiftedJaw[index]._y,
                                                });
                                            }
                                        );
                                        shiftedMouth.forEach(
                                            (mouthPoint, index) => {
                                                mouth.push({
                                                    _x: shiftedMouth[index]._x,
                                                    _y:
                                                        unshiftedMouth[index]
                                                            ._y,
                                                });
                                            }
                                        );
                                        shiftedNose.forEach(
                                            (nosePoint, index) => {
                                                try {
                                                    nose.push({
                                                        _x:
                                                            shiftedNose[index]
                                                                ._x,
                                                        _y:
                                                            unshiftedNose[index]
                                                                ._y,
                                                    });
                                                } catch (err) {
                                                    nose.push({
                                                        _x:
                                                            shiftedNose[index]
                                                                ._x,
                                                        _y:
                                                            shiftedNose[index]
                                                                ._y,
                                                    });
                                                }
                                            }
                                        );
                                    } else {
                                        shiftedLeftEye.forEach(
                                            (eyePoint, index) => {
                                                leftEye.push({
                                                    _x:
                                                        unshiftedLeftEye[index]
                                                            ._x,
                                                    _y:
                                                        shiftedLeftEye[index]
                                                            ._y,
                                                });
                                                rightEye.push({
                                                    _x:
                                                        unshiftedRightEye[index]
                                                            ._x,
                                                    _y:
                                                        shiftedRightEye[index]
                                                            ._y,
                                                });
                                            }
                                        );
                                        shiftedLeftEyeBrow.forEach(
                                            (eyeBrowPoint, index) => {
                                                leftEyeBrow.push({
                                                    _x:
                                                        unshiftedLeftEyeBrow[
                                                            index
                                                        ]._x,
                                                    _y:
                                                        shiftedLeftEyeBrow[
                                                            index
                                                        ]._y,
                                                });
                                                rightEyeBrow.push({
                                                    _x:
                                                        unshiftedRightEyeBrow[
                                                            index
                                                        ]._x,
                                                    _y:
                                                        shiftedRightEyeBrow[
                                                            index
                                                        ]._y,
                                                });
                                            }
                                        );
                                        shiftedJaw.forEach(
                                            (jawPoint, index) => {
                                                jaw.push({
                                                    _x: unshiftedJaw[index]._x,
                                                    _y: shiftedJaw[index]._y,
                                                });
                                            }
                                        );
                                        shiftedMouth.forEach(
                                            (mouthPoint, index) => {
                                                mouth.push({
                                                    _x:
                                                        unshiftedMouth[index]
                                                            ._x,
                                                    _y: shiftedMouth[index]._y,
                                                });
                                            }
                                        );
                                        shiftedNose.forEach(
                                            (nosePoint, index) => {
                                                try {
                                                    nose.push({
                                                        _x:
                                                            unshiftedNose[index]
                                                                ._x,
                                                        _y:
                                                            shiftedNose[index]
                                                                ._y,
                                                    });
                                                } catch (err) {
                                                    nose.push({
                                                        _x:
                                                            shiftedNose[index]
                                                                ._x,
                                                        _y:
                                                            shiftedNose[index]
                                                                ._y,
                                                    });
                                                }
                                            }
                                        );
                                    }
                                }

                                let leftEyeBoxWidth =
                                    leftEye[3]._x - leftEye[0]._x;
                                let rightEyeBoxWidth =
                                    rightEye[3]._x - rightEye[0]._x;

                                let leftEyeBoxHeight =
                                    Math.max(leftEye[4]._y, leftEye[5]._y) -
                                    Math.min(leftEye[1]._y, leftEye[2]._y);
                                let rightEyeBoxHeight =
                                    Math.max(rightEye[4]._y, rightEye[5]._y) -
                                    Math.min(rightEye[1]._y, rightEye[2]._y);

                                let calcBoxWidth = Math.max(
                                    1.2 * leftEyeBoxWidth,
                                    1.2 * rightEyeBoxWidth
                                );
                                let calcBoxHeight = Math.max(
                                    1.2 * leftEyeBoxHeight,
                                    1.2 * rightEyeBoxHeight
                                );

                                let leftDarkCircleBox = {
                                    x: leftEye[0]._x - leftEyeBoxWidth * 0.1,
                                    y:
                                        Math.max(leftEye[4]._y, leftEye[5]._y) +
                                        0.6 * leftEyeBoxHeight,
                                    w: calcBoxWidth,
                                    h: calcBoxHeight,
                                };
                                let rightDarkCircleBox = {
                                    x: rightEye[0]._x - rightEyeBoxWidth * 0.1,
                                    y:
                                        Math.max(
                                            rightEye[4]._y,
                                            rightEye[5]._y
                                        ) +
                                        0.6 * rightEyeBoxHeight,
                                    w: calcBoxWidth,
                                    h: calcBoxHeight,
                                };

                                let leftCompareBox = {
                                    x:
                                        leftDarkCircleBox.x -
                                        0.3 * leftDarkCircleBox.w,
                                    y:
                                        leftDarkCircleBox.y +
                                        leftDarkCircleBox.h,
                                    w: leftDarkCircleBox.w,
                                    h: leftDarkCircleBox.h,
                                };
                                let rightCompareBox = {
                                    x:
                                        rightDarkCircleBox.x +
                                        0.3 * leftDarkCircleBox.w,
                                    y:
                                        rightDarkCircleBox.y +
                                        rightDarkCircleBox.h,
                                    w: rightDarkCircleBox.w,
                                    h: rightDarkCircleBox.h,
                                };

                                let darkCircleImgDataLeft = ctx.getImageData(
                                    leftDarkCircleBox.x,
                                    leftDarkCircleBox.y,
                                    leftDarkCircleBox.w,
                                    leftDarkCircleBox.h
                                );
                                let compareImgDataLeft = ctx.getImageData(
                                    leftCompareBox.x,
                                    leftCompareBox.y,
                                    leftCompareBox.w,
                                    leftCompareBox.h
                                );
                                let darkCircleImgDataRight = ctx.getImageData(
                                    rightDarkCircleBox.x,
                                    rightDarkCircleBox.y,
                                    rightDarkCircleBox.w,
                                    rightDarkCircleBox.h
                                );
                                let compareImgDataRight = ctx.getImageData(
                                    rightCompareBox.x,
                                    rightCompareBox.y,
                                    rightCompareBox.w,
                                    rightCompareBox.h
                                );

                                let darkCircleR = 0;
                                let darkCircleG = 0;
                                let darkCircleB = 0;
                                let compareR = 0;
                                let compareG = 0;
                                let compareB = 0;

                                for (
                                    let ii = 0;
                                    ii < darkCircleImgDataLeft.data.length / 4;
                                    ii++
                                ) {
                                    darkCircleR +=
                                        darkCircleImgDataLeft.data[4 * ii] /
                                            255 +
                                        darkCircleImgDataRight.data[4 * ii] /
                                            255;
                                    darkCircleG +=
                                        darkCircleImgDataLeft.data[4 * ii + 1] /
                                            255 +
                                        darkCircleImgDataRight.data[
                                            4 * ii + 1
                                        ] /
                                            255;
                                    darkCircleB +=
                                        darkCircleImgDataLeft.data[4 * ii + 2] /
                                            255 +
                                        darkCircleImgDataRight.data[
                                            4 * ii + 2
                                        ] /
                                            255;
                                    compareR +=
                                        compareImgDataLeft.data[4 * ii] / 255 +
                                        compareImgDataRight.data[4 * ii] / 255;
                                    compareG +=
                                        compareImgDataLeft.data[4 * ii + 1] /
                                            255 +
                                        compareImgDataRight.data[4 * ii + 1] /
                                            255;
                                    compareB +=
                                        compareImgDataLeft.data[4 * ii + 2] /
                                            255 +
                                        compareImgDataRight.data[4 * ii + 2] /
                                            255;
                                }

                                let darkCircleLight =
                                    0.2126 * darkCircleR +
                                    0.7152 * darkCircleG +
                                    0.0722 * darkCircleB;
                                let compareLight =
                                    0.2126 * compareR +
                                    0.7152 * compareG +
                                    0.0722 * compareB;

                                darkCircleScore = Math.max(
                                    1,
                                    Math.min(
                                        5,
                                        Math.floor(
                                            ((-50 / 3) * darkCircleLight) /
                                                compareLight +
                                                52 / 3
                                        )
                                    )
                                );

                                if (isNaN(darkCircleScore)) {
                                    darkCircleScore = 2;
                                }
                            });
                            resolve({
                                concerns: {
                                    dark_circles: darkCircleScore,
                                    dehydration: "2",
                                },
                            });
                        })
                        .catch((e) => {
                            console.log(
                                "error in face detection on calc scores"
                            );
                            resolve({
                                concerns: {
                                    dark_circles: "2",
                                    dehydration: "2",
                                },
                            });
                        });
                } catch (err) {
                    reject(err);
                }
            }
        });
    };

    const getColorFromGradient = (gradientPoint) => {
        let colorObj = { r: 0, g: 0, b: 0 };
        if (gradientPoint > 210) {
            colorObj.r = 225 + Math.round(30 * ((gradientPoint - 210) / 45));
            colorObj.g = 141 - Math.round(141 * ((gradientPoint - 210) / 45));
            colorObj.b = 0;
        } else if (gradientPoint > 160) {
            colorObj.r = 242 - Math.round(13 * ((gradientPoint - 160) / 50));
            colorObj.g = 226 - Math.round(85 * ((gradientPoint - 160) / 50));
            colorObj.b = 0;
        } else {
            colorObj.r = 55 - Math.round(44 * (gradientPoint / 160));
            colorObj.g = 192 - Math.round(50 * (gradientPoint / 160));
            colorObj.b = 176 + Math.round(16 * (gradientPoint / 160));
        }
        return colorObj;
    };

    const calcOpacityEllipse = (
        point_x,
        point_y,
        ellRectObj,
        fullAlphaFact = 0.05
    ) => {
        let scaleDimensions = 0.9;
        counter++;
        if (counter % 100 == 0 || true) {
            let aSqu =
                (ellRectObj.w / 2) *
                scaleDimensions *
                ((ellRectObj.w / 2) * scaleDimensions);
            let bSqu =
                (ellRectObj.h / 2) *
                scaleDimensions *
                ((ellRectObj.h / 2) * scaleDimensions);
            let centX = ellRectObj.x + 0.5 * ellRectObj.w;
            let centY = ellRectObj.y + 0.5 * ellRectObj.h;
            let ellVal =
                ((point_x - centX) * (point_x - centX)) / aSqu +
                ((point_y - centY) * (point_y - centY)) / bSqu -
                1;
            let alpha255 = Math.round(
                Math.min(1, Math.max(0, -ellVal / fullAlphaFact)) * 255
            );
            return alpha255;
        } else {
            return 0;
        }
    };

    // DEHYDRATION MASK
    const rdcpupMakeDehydrationMaskImageURL = () => {
        console.log("Inside rdcpupMakeDehydrationMaskImageURL");
        return new Promise((resolve, reject) => {
            try {
                let options = getFaceDetectorOptions();
                let canvas = document.getElementById(
                    "rdcpup_dehydration_canvas"
                );
                let ctx = canvas.getContext("2d");
                faceapi
                    .detectAllFaces(canvas, options)
                    .withFaceLandmarks()
                    .then((landmarkDataArray) => {
                        if (landmarkDataArray.length > 0) {
                            landmarkDataArray.forEach((landmarkData, index) => {
                                let leftEye = [];
                                let rightEye = [];
                                let leftEyeBrow = [];
                                let rightEyeBrow = [];
                                let jaw = [];
                                let mouth = [];
                                let nose = [];

                                if (
                                    landmarkData.landmarks._shift._x >= 0 &&
                                    landmarkData.landmarks._shift._y >= 0
                                ) {
                                    leftEye = landmarkData.landmarks.getLeftEye();
                                    rightEye = landmarkData.landmarks.getRightEye();
                                    leftEyeBrow = landmarkData.landmarks.getLeftEyeBrow();
                                    rightEyeBrow = landmarkData.landmarks.getRightEyeBrow();
                                    jaw = landmarkData.landmarks.getJawOutline();
                                    mouth = landmarkData.landmarks.getMouth();
                                    nose = landmarkData.landmarks.getNose();
                                } else if (
                                    landmarkData.landmarks._shift._x < 0 &&
                                    landmarkData.landmarks._shift._y < 0
                                ) {
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
                                        shiftedLeftEye.forEach(
                                            (eyePoint, index) => {
                                                leftEye.push({
                                                    _x:
                                                        shiftedLeftEye[index]
                                                            ._x,
                                                    _y:
                                                        unshiftedLeftEye[index]
                                                            ._y,
                                                });
                                                rightEye.push({
                                                    _x:
                                                        shiftedRightEye[index]
                                                            ._x,
                                                    _y:
                                                        unshiftedRightEye[index]
                                                            ._y,
                                                });
                                            }
                                        );
                                        shiftedLeftEyeBrow.forEach(
                                            (eyeBrowPoint, index) => {
                                                leftEyeBrow.push({
                                                    _x:
                                                        shiftedLeftEyeBrow[
                                                            index
                                                        ]._x,
                                                    _y:
                                                        unshiftedLeftEyeBrow[
                                                            index
                                                        ]._y,
                                                });
                                                rightEyeBrow.push({
                                                    _x:
                                                        shiftedRightEyeBrow[
                                                            index
                                                        ]._x,
                                                    _y:
                                                        unshiftedRightEyeBrow[
                                                            index
                                                        ]._y,
                                                });
                                            }
                                        );
                                        shiftedJaw.forEach(
                                            (jawPoint, index) => {
                                                jaw.push({
                                                    _x: shiftedJaw[index]._x,
                                                    _y: unshiftedJaw[index]._y,
                                                });
                                            }
                                        );
                                        shiftedMouth.forEach(
                                            (mouthPoint, index) => {
                                                mouth.push({
                                                    _x: shiftedMouth[index]._x,
                                                    _y:
                                                        unshiftedMouth[index]
                                                            ._y,
                                                });
                                            }
                                        );
                                        shiftedNose.forEach(
                                            (nosePoint, index) => {
                                                try {
                                                    nose.push({
                                                        _x:
                                                            shiftedNose[index]
                                                                ._x,
                                                        _y:
                                                            unshiftedNose[index]
                                                                ._y,
                                                    });
                                                } catch (err) {
                                                    nose.push({
                                                        _x:
                                                            shiftedNose[index]
                                                                ._x,
                                                        _y:
                                                            shiftedNose[index]
                                                                ._y,
                                                    });
                                                }
                                            }
                                        );
                                    } else {
                                        shiftedLeftEye.forEach(
                                            (eyePoint, index) => {
                                                leftEye.push({
                                                    _x:
                                                        unshiftedLeftEye[index]
                                                            ._x,
                                                    _y:
                                                        shiftedLeftEye[index]
                                                            ._y,
                                                });
                                                rightEye.push({
                                                    _x:
                                                        unshiftedRightEye[index]
                                                            ._x,
                                                    _y:
                                                        shiftedRightEye[index]
                                                            ._y,
                                                });
                                            }
                                        );
                                        shiftedLeftEyeBrow.forEach(
                                            (eyeBrowPoint, index) => {
                                                leftEyeBrow.push({
                                                    _x:
                                                        unshiftedLeftEyeBrow[
                                                            index
                                                        ]._x,
                                                    _y:
                                                        shiftedLeftEyeBrow[
                                                            index
                                                        ]._y,
                                                });
                                                rightEyeBrow.push({
                                                    _x:
                                                        unshiftedRightEyeBrow[
                                                            index
                                                        ]._x,
                                                    _y:
                                                        shiftedRightEyeBrow[
                                                            index
                                                        ]._y,
                                                });
                                            }
                                        );
                                        shiftedJaw.forEach(
                                            (jawPoint, index) => {
                                                jaw.push({
                                                    _x: unshiftedJaw[index]._x,
                                                    _y: shiftedJaw[index]._y,
                                                });
                                            }
                                        );
                                        shiftedMouth.forEach(
                                            (mouthPoint, index) => {
                                                mouth.push({
                                                    _x:
                                                        unshiftedMouth[index]
                                                            ._x,
                                                    _y: shiftedMouth[index]._y,
                                                });
                                            }
                                        );
                                        shiftedNose.forEach(
                                            (nosePoint, index) => {
                                                try {
                                                    nose.push({
                                                        _x:
                                                            unshiftedNose[index]
                                                                ._x,
                                                        _y:
                                                            shiftedNose[index]
                                                                ._y,
                                                    });
                                                } catch (err) {
                                                    nose.push({
                                                        _x:
                                                            shiftedNose[index]
                                                                ._x,
                                                        _y:
                                                            shiftedNose[index]
                                                                ._y,
                                                    });
                                                }
                                            }
                                        );
                                    }
                                }

                                let topLeftEyeBrowY = leftEyeBrow[2]._y;
                                let topRightEyeBrowY = rightEyeBrow[2]._y;
                                let lowLeftEyeY = Math.max(
                                    leftEye[4]._y,
                                    leftEye[5]._y
                                );
                                let lowRightEyeY = Math.max(
                                    rightEye[4]._y,
                                    rightEye[5]._y
                                );

                                let faceRectToScan = {
                                    x:
                                        Math.round(jaw[2]._x) +
                                        0.0 * (jaw[14]._x - jaw[2]._x),
                                    y: Math.round(
                                        2.0 *
                                            Math.min(
                                                topLeftEyeBrowY,
                                                topRightEyeBrowY
                                            ) -
                                            1.0 *
                                                Math.min(
                                                    lowLeftEyeY,
                                                    lowRightEyeY
                                                ) -
                                            0.05 *
                                                (jaw[8]._y -
                                                    2.0 *
                                                        Math.min(
                                                            topLeftEyeBrowY,
                                                            topRightEyeBrowY
                                                        ) +
                                                    1.0 *
                                                        Math.min(
                                                            lowLeftEyeY,
                                                            lowRightEyeY
                                                        ))
                                    ),
                                    w: Math.round(
                                        1.0 * (jaw[14]._x - jaw[2]._x)
                                    ), //w: Math.round(1.0*(rightEyeBrow[4]._x - leftEyeBrow[0]._x)),
                                    h: Math.round(
                                        1.1 *
                                            (jaw[8]._y -
                                                2.0 *
                                                    Math.min(
                                                        topLeftEyeBrowY,
                                                        topRightEyeBrowY
                                                    ) +
                                                1.0 *
                                                    Math.min(
                                                        lowLeftEyeY,
                                                        lowRightEyeY
                                                    ))
                                    ),
                                };

                                let leftEyeBlankRect = {
                                    x: Math.round(jaw[0]._x),
                                    y: Math.round(
                                        topLeftEyeBrowY -
                                            0.2 *
                                                (lowLeftEyeY - topLeftEyeBrowY)
                                    ),
                                    w: Math.round(
                                        0.5 * leftEye[3]._x +
                                            0.5 * rightEye[0]._x -
                                            jaw[0]._x
                                    ),
                                    h: Math.round(
                                        1.7 * (lowLeftEyeY - topLeftEyeBrowY)
                                    ),
                                };

                                let rightEyeBlankRect = {
                                    x: Math.round(
                                        leftEye[3]._x +
                                            0.5 *
                                                (rightEye[0]._x - leftEye[3]._x)
                                    ),
                                    y: Math.round(
                                        topRightEyeBrowY -
                                            0.2 *
                                                (lowRightEyeY -
                                                    topRightEyeBrowY)
                                    ),
                                    w: Math.round(
                                        jaw[16]._x -
                                            leftEye[3]._x -
                                            0.5 *
                                                (rightEye[0]._x - leftEye[3]._x)
                                    ),
                                    h: Math.round(
                                        1.7 * (lowRightEyeY - topRightEyeBrowY)
                                    ),
                                };

                                let mouthBlankRect = {
                                    x: Math.round(
                                        mouth[0]._x -
                                            0.2 * (mouth[6]._x - mouth[0]._x)
                                    ),
                                    y: Math.round(
                                        mouth[2]._y -
                                            0.2 * (mouth[9]._y - mouth[2]._y)
                                    ),
                                    w: Math.round(
                                        1.4 * (mouth[6]._x - mouth[0]._x)
                                    ),
                                    h: Math.round(
                                        1.4 * (mouth[9]._y - mouth[2]._y)
                                    ),
                                };

                                let noseBlankRect = {
                                    x: Math.round(
                                        nose[4]._x -
                                            0.5 * (nose[8]._x - nose[4]._x)
                                    ),
                                    y: Math.round(
                                        nose[3]._y -
                                            0.7 * (nose[6]._y - nose[3]._y)
                                    ),
                                    w: Math.round(
                                        2 * (nose[8]._x - nose[4]._x)
                                    ),
                                    h: Math.round(
                                        2 * (nose[6]._y - nose[3]._y)
                                    ),
                                };

                                let dehydrationImgData = ctx.getImageData(
                                    faceRectToScan.x,
                                    faceRectToScan.y,
                                    faceRectToScan.w,
                                    faceRectToScan.h
                                );
                                let newImgData = ctx.createImageData(
                                    dehydrationImgData.width,
                                    dehydrationImgData.height
                                );

                                let y = 0;
                                let x = 0;
                                let modTarget = Math.ceil(
                                    dehydrationImgData.height / 200
                                );

                                function processImageBlocks() {
                                    return new Promise((imgRes, imgRej) => {
                                        let initBlockCall = true;
                                        while (
                                            (y < dehydrationImgData.height &&
                                                y % modTarget != 0) ||
                                            initBlockCall
                                        ) {
                                            initBlockCall = false;
                                            while (
                                                x < dehydrationImgData.width
                                            ) {
                                                let ii =
                                                    y *
                                                        dehydrationImgData.width +
                                                    x;
                                                let minBlue = 255;
                                                let maxBlue = 0;
                                                let avCounter = 0;

                                                for (
                                                    var scan_x = -10;
                                                    scan_x < 11;
                                                    scan_x++
                                                ) {
                                                    for (
                                                        var scan_y = -10;
                                                        scan_y < 11;
                                                        scan_y++
                                                    ) {
                                                        let idx =
                                                            ii -
                                                            scan_x +
                                                            scan_y *
                                                                dehydrationImgData.width;
                                                        while (idx < 0) {
                                                            idx +=
                                                                dehydrationImgData
                                                                    .data
                                                                    .length / 4;
                                                        }
                                                        while (
                                                            idx >=
                                                            dehydrationImgData
                                                                .data.length /
                                                                4
                                                        ) {
                                                            idx -=
                                                                dehydrationImgData
                                                                    .data
                                                                    .length / 4;
                                                        }

                                                        minBlue = Math.min(
                                                            minBlue,
                                                            dehydrationImgData
                                                                .data[
                                                                idx * 4 + 2
                                                            ]
                                                        );
                                                        maxBlue = Math.max(
                                                            maxBlue,
                                                            dehydrationImgData
                                                                .data[
                                                                idx * 4 + 2
                                                            ]
                                                        );
                                                        avCounter++;
                                                    }
                                                }

                                                let curColorObj = getColorFromGradient(
                                                    Math.min(
                                                        Math.max(
                                                            Math.round(
                                                                ((dehydrationImgData
                                                                    .data[
                                                                    ii * 4 + 2
                                                                ] -
                                                                    minBlue) /
                                                                    (maxBlue -
                                                                        minBlue)) *
                                                                    255
                                                            ),
                                                            0
                                                        ),
                                                        255
                                                    )
                                                );

                                                newImgData.data[ii * 4 + 0] =
                                                    curColorObj.r;
                                                newImgData.data[ii * 4 + 1] =
                                                    curColorObj.g;
                                                newImgData.data[ii * 4 + 2] =
                                                    curColorObj.b;

                                                let faceAlpha = calcOpacityEllipse(
                                                    ii %
                                                        dehydrationImgData.width,
                                                    Math.floor(
                                                        ii /
                                                            dehydrationImgData.width
                                                    ),
                                                    {
                                                        x: 0,
                                                        y: 0,
                                                        w:
                                                            dehydrationImgData.width,
                                                        h:
                                                            dehydrationImgData.height,
                                                    },
                                                    0.2
                                                );
                                                let leftEyeAlpha =
                                                    255 -
                                                    calcOpacityEllipse(
                                                        ii %
                                                            dehydrationImgData.width,
                                                        Math.floor(
                                                            ii /
                                                                dehydrationImgData.width
                                                        ),
                                                        {
                                                            x: Math.round(
                                                                leftEyeBlankRect.x -
                                                                    faceRectToScan.x
                                                            ),
                                                            y: Math.round(
                                                                leftEyeBlankRect.y -
                                                                    faceRectToScan.y
                                                            ),
                                                            w:
                                                                leftEyeBlankRect.w,
                                                            h:
                                                                leftEyeBlankRect.h,
                                                        },
                                                        0.4
                                                    );
                                                let rightEyeAlpha =
                                                    255 -
                                                    calcOpacityEllipse(
                                                        ii %
                                                            dehydrationImgData.width,
                                                        Math.floor(
                                                            ii /
                                                                dehydrationImgData.width
                                                        ),
                                                        {
                                                            x: Math.round(
                                                                rightEyeBlankRect.x -
                                                                    faceRectToScan.x
                                                            ),
                                                            y: Math.round(
                                                                rightEyeBlankRect.y -
                                                                    faceRectToScan.y
                                                            ),
                                                            w:
                                                                rightEyeBlankRect.w,
                                                            h:
                                                                rightEyeBlankRect.h,
                                                        },
                                                        0.4
                                                    );
                                                let mouthAlpha =
                                                    255 -
                                                    calcOpacityEllipse(
                                                        ii %
                                                            dehydrationImgData.width,
                                                        Math.floor(
                                                            ii /
                                                                dehydrationImgData.width
                                                        ),
                                                        {
                                                            x: Math.round(
                                                                mouthBlankRect.x -
                                                                    faceRectToScan.x
                                                            ),
                                                            y: Math.round(
                                                                mouthBlankRect.y -
                                                                    faceRectToScan.y
                                                            ),
                                                            w: mouthBlankRect.w,
                                                            h: mouthBlankRect.h,
                                                        },
                                                        0.4
                                                    );
                                                let noseAlpha =
                                                    255 -
                                                    calcOpacityEllipse(
                                                        ii %
                                                            dehydrationImgData.width,
                                                        Math.floor(
                                                            ii /
                                                                dehydrationImgData.width
                                                        ),
                                                        {
                                                            x: Math.round(
                                                                noseBlankRect.x -
                                                                    faceRectToScan.x
                                                            ),
                                                            y: Math.round(
                                                                noseBlankRect.y -
                                                                    faceRectToScan.y
                                                            ),
                                                            w: noseBlankRect.w,
                                                            h: noseBlankRect.h,
                                                        },
                                                        0.4
                                                    );

                                                let maskAlpha =
                                                    (1 *
                                                        Math.min(
                                                            faceAlpha,
                                                            leftEyeAlpha,
                                                            rightEyeAlpha,
                                                            mouthAlpha,
                                                            noseAlpha
                                                        )) /
                                                    255;

                                                newImgData.data[
                                                    ii * 4 + 0
                                                ] = Math.round(
                                                    maskAlpha *
                                                        newImgData.data[
                                                            ii * 4 + 0
                                                        ] +
                                                        (1 - maskAlpha) *
                                                            dehydrationImgData
                                                                .data[
                                                                ii * 4 + 0
                                                            ]
                                                );
                                                newImgData.data[
                                                    ii * 4 + 1
                                                ] = Math.round(
                                                    maskAlpha *
                                                        newImgData.data[
                                                            ii * 4 + 1
                                                        ] +
                                                        (1 - maskAlpha) *
                                                            dehydrationImgData
                                                                .data[
                                                                ii * 4 + 1
                                                            ]
                                                );
                                                newImgData.data[
                                                    ii * 4 + 2
                                                ] = Math.round(
                                                    maskAlpha *
                                                        newImgData.data[
                                                            ii * 4 + 2
                                                        ] +
                                                        (1 - maskAlpha) *
                                                            dehydrationImgData
                                                                .data[
                                                                ii * 4 + 2
                                                            ]
                                                );
                                                newImgData.data[
                                                    ii * 4 + 3
                                                ] = 255;
                                                x++;
                                            }
                                            x = 0;
                                            y++;
                                        }

                                        ctx.putImageData(
                                            newImgData,
                                            faceRectToScan.x,
                                            faceRectToScan.y
                                        );
                                        if (y < dehydrationImgData.height) {
                                            setTimeout(() => {
                                                processImageBlocks();
                                            }, 5);
                                        } else {
                                            let imageMaskUrl = canvas.toDataURL(
                                                "image/jpeg"
                                            );
                                            dehydrationImgData = null;
                                            newImgData = null;
                                            resolve(imageMaskUrl);
                                        }
                                    });
                                }
                                processImageBlocks();
                            });
                        } else {
                            resultsCounter = 0;
                            document.getElementById("detectionHint").innerHTML =
                                constants.detectionDict.reposition;
                        }
                    })
                    .catch((e) => {
                        console.log(
                            "cannot create dehydration mask - using original"
                        );
                        let imgUrl = canvas.toDataURL("image/jpeg");
                        resolve(imgUrl);
                    });
            } catch (err) {
                console.log("concern calculation failed", err);
                reject(err);
            }
        });
    };

    const rdcpupDrawWhiteEllipseInRectOnCanvas = (
        point_x,
        point_y,
        width,
        height,
        canvasId = "rdcpup_dark_circles_canvas"
    ) => {
        let ctx = document.getElementById(canvasId).getContext("2d");
        let scaleFact = 1.2;
        let scaledWidth = width * 1.2;
        let scaledHeight = height * 1.2;
        let centerX = point_x + 0.5 * width;
        let centerY = point_y + 0.5 * height;
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2, centerY); // A1
        ctx.bezierCurveTo(
            centerX - scaledWidth / 2,
            centerY - scaledHeight / 2, // C1
            centerX + scaledWidth / 2,
            centerY - scaledHeight / 2, // C2
            centerX + scaledWidth / 2,
            centerY
        ); // A2
        ctx.bezierCurveTo(
            centerX + scaledWidth / 2,
            centerY + scaledHeight / 2, // C3
            centerX - scaledWidth / 2,
            centerY + scaledHeight / 2, // C4
            centerX - scaledWidth / 2,
            centerY
        ); // A1
        ctx.strokeStyle = "white";
        ctx.stroke();
        ctx.closePath();
    };

    // DARK CIRCLE MASK
    const rdcpupMakeDarkCirclesMaskImageURL = () => {
        console.log("Inside rdcpupMakeDarkCirclesMaskImageURL");
        return new Promise((resolve, reject) => {
            try {
                let options = getFaceDetectorOptions();
                let canvas = document.getElementById(
                    "rdcpup_dark_circles_canvas"
                );
                let ctx = canvas.getContext("2d");
                faceapi
                    .detectAllFaces(canvas, options)
                    .withFaceLandmarks()
                    .then((landmarkDataArray) => {
                        if (landmarkDataArray.length > 0) {
                            landmarkDataArray.forEach((landmarkData, index) => {
                                let leftEye = [];
                                let rightEye = [];
                                if (
                                    landmarkData.landmarks._shift._x >= 0 &&
                                    landmarkData.landmarks._shift._y >= 0
                                ) {
                                    leftEye = landmarkData.landmarks.getLeftEye();
                                    rightEye = landmarkData.landmarks.getRightEye();
                                } else if (
                                    landmarkData.landmarks._shift._x < 0 &&
                                    landmarkData.landmarks._shift._y < 0
                                ) {
                                    leftEye = landmarkData.unshiftedLandmarks.getLeftEye();
                                    rightEye = landmarkData.unshiftedLandmarks.getRightEye();
                                } else {
                                    let unshiftedLeftEye = landmarkData.unshiftedLandmarks.getLeftEye();
                                    let unshiftedRightEye = landmarkData.unshiftedLandmarks.getRightEye();
                                    let shiftedLeftEye = landmarkData.landmarks.getLeftEye();
                                    let shiftedRightEye = landmarkData.landmarks.getRightEye();
                                    if (landmarkData.landmarks._shift._x >= 0) {
                                        shiftedLeftEye.forEach(
                                            (eyePoint, index) => {
                                                leftEye.push({
                                                    _x:
                                                        shiftedLeftEye[index]
                                                            ._x,
                                                    _y:
                                                        unshiftedLeftEye[index]
                                                            ._y,
                                                });
                                                rightEye.push({
                                                    _x:
                                                        shiftedRightEye[index]
                                                            ._x,
                                                    _y:
                                                        unshiftedRightEye[index]
                                                            ._y,
                                                });
                                            }
                                        );
                                    } else {
                                        shiftedLeftEye.forEach(
                                            (eyePoint, index) => {
                                                leftEye.push({
                                                    _x:
                                                        unshiftedLeftEye[index]
                                                            ._x,
                                                    _y:
                                                        shiftedLeftEye[index]
                                                            ._y,
                                                });
                                                rightEye.push({
                                                    _x:
                                                        unshiftedRightEye[index]
                                                            ._x,
                                                    _y:
                                                        shiftedRightEye[index]
                                                            ._y,
                                                });
                                            }
                                        );
                                    }
                                }

                                let leftEyeBoxWidth =
                                    leftEye[3]._x - leftEye[0]._x;
                                let rightEyeBoxWidth =
                                    rightEye[3]._x - rightEye[0]._x;

                                let leftEyeBoxHeight =
                                    Math.max(leftEye[4]._y, leftEye[5]._y) -
                                    Math.min(leftEye[1]._y, leftEye[2]._y);
                                let rightEyeBoxHeight =
                                    Math.max(rightEye[4]._y, rightEye[5]._y) -
                                    Math.min(rightEye[1]._y, rightEye[2]._y);

                                let leftDarkCircleBox = {
                                    x: leftEye[0]._x - leftEyeBoxWidth * 0.1,
                                    y:
                                        Math.max(leftEye[4]._y, leftEye[5]._y) +
                                        0.6 * leftEyeBoxHeight,
                                    w: 1.2 * leftEyeBoxWidth,
                                    h: 1.2 * leftEyeBoxHeight,
                                };
                                let rightDarkCircleBox = {
                                    x: rightEye[0]._x - rightEyeBoxWidth * 0.1,
                                    y:
                                        Math.max(
                                            rightEye[4]._y,
                                            rightEye[5]._y
                                        ) +
                                        0.6 * rightEyeBoxHeight,
                                    w: 1.2 * rightEyeBoxWidth,
                                    h: 1.2 * rightEyeBoxHeight,
                                };

                                rdcpupDrawWhiteEllipseInRectOnCanvas(
                                    leftDarkCircleBox.x,
                                    leftDarkCircleBox.y,
                                    leftDarkCircleBox.w,
                                    leftDarkCircleBox.h,
                                    "rdcpup_dark_circles_canvas"
                                );
                                rdcpupDrawWhiteEllipseInRectOnCanvas(
                                    rightDarkCircleBox.x,
                                    rightDarkCircleBox.y,
                                    rightDarkCircleBox.w,
                                    rightDarkCircleBox.h,
                                    "rdcpup_dark_circles_canvas"
                                );

                                let imgUrl = canvas.toDataURL("image/jpeg");
                                resolve(imgUrl);
                            });
                        } else {
                            resultsCounter = 0;
                            document.getElementById("detectionHint").innerHTML =
                                constants.detectionDict.reposition;
                        }
                    })
                    .catch((e) => {
                        console.log(
                            "cannot create new dark circles mask - using original"
                        );
                        let imgUrl = canvas.toDataURL("image/jpeg");
                        resolve(imgUrl);
                    });
            } catch (err) {
                console.log("DARK CIRCLES URL: ", err);
                reject(err);
            }
        });
    };

    // DEHYDRATION AND DARK CIRCLE MASK
    const rdcpupUpdateMaskOverlays = (originalImage, tempConcerns) => {
        console.log("Inside rdcpupUpdateMaskOverlays");
        if (
            constants.rdcpupDehydrImgUrl == "" ||
            constants.rdcpupDarkCircImgUrl == ""
        ) {
            let origImage = new Image();
            origImage.crossOrigin = "anonymous";
            origImage.onload = () => {
                let dehydration_canvas = document.getElementById(
                    "rdcpup_dehydration_canvas"
                );
                let dehydration_ctx = dehydration_canvas.getContext("2d");
                let dark_cir_canvas = document.getElementById(
                    "rdcpup_dark_circles_canvas"
                );
                let dark_cir_ctx = dark_cir_canvas.getContext("2d");

                dehydration_canvas.width = origImage.naturalWidth;
                dehydration_canvas.height = origImage.naturalHeight;
                dark_cir_canvas.width = origImage.naturalWidth;
                dark_cir_canvas.height = origImage.naturalHeight;

                dehydration_ctx.drawImage(
                    origImage,
                    0,
                    0,
                    dehydration_canvas.width,
                    dehydration_canvas.height
                );
                dark_cir_ctx.drawImage(
                    origImage,
                    0,
                    0,
                    dark_cir_canvas.width,
                    dark_cir_canvas.height
                );

                rdcpupMakeDehydrationMaskImageURL()
                    .then((dehydrationImgUrl) => {
                        tempConcerns.forEach((concern, index) => {
                            if (concern.name == "dehydration") {
                                tempConcerns[index].image = dehydrationImgUrl;
                            }
                        });

                        rdcpupMakeDarkCirclesMaskImageURL()
                            .then((darkCircleImgUrl) => {
                                tempConcerns.forEach((concern, index) => {
                                    if (concern.name == "dark_circles") {
                                        tempConcerns[
                                            index
                                        ].image = darkCircleImgUrl;
                                        console.log(
                                            "tempConcerns",
                                            tempConcerns
                                        );
                                        setConcerns(tempConcerns);
                                        document.getElementById(
                                            "detectionHint"
                                        ).innerHTML =
                                            constants.detectionDict.thankyou;
                                        clearInterval(detectionInterval);
                                    }
                                });
                            })
                            .catch((err) => {
                                console.log(
                                    "error in dark circle mask - ",
                                    err
                                );
                                setConcerns(tempConcerns);
                            });
                    })
                    .catch((err) => {
                        console.log("error in dehydration mask - ", err);
                        setConcerns(tempConcerns);
                    });
            };
            origImage.src = originalImage;
        }
    };

    // ANALYZE IMAGE
    const analyzeImage = (canvasId = "rdcpup_camera_canvas") => {
        console.log("Inside analyzeimage");
        rdcpupCropToFace(canvasId)
            .then((canvasIdAfterCrop) => {
                rdcpupLimitImageSize(canvasIdAfterCrop)
                    .then((canvasIdAfterLimit) => {
                        let originalImage = document
                            .getElementById(canvasIdAfterLimit)
                            .toDataURL("image/jpeg");
                        let canvas_score = document.getElementById(
                            canvasIdAfterLimit
                        );
                        let ctx_score = canvas_score.getContext("2d");
                        let concernImage = new Image();
                        concernImage.onload = () => {
                            ctx_score.drawImage(
                                concernImage,
                                0,
                                0,
                                canvas_score.width,
                                canvas_score.height
                            );
                            rdcpupCalcConcerns(canvasIdAfterLimit)
                                .then((res) => {
                                    setStopVideo(true);
                                    let tempConcerns = [];
                                    for (let key in res.concerns) {
                                        let obj = {
                                            name: key,
                                            score: Number(res.concerns[key]),
                                            image: null,
                                        };
                                        tempConcerns.push(obj);
                                    }
                                    rdcpupUpdateMaskOverlays(
                                        originalImage,
                                        tempConcerns
                                    );
                                })
                                .catch((err) => {
                                    console.log(
                                        "error in calculate concerns - ",
                                        err
                                    );
                                });
                        };
                        concernImage.src = originalImage;
                    })
                    .catch((err) => {
                        console.log("error in limiting image size - ", err);
                        let imgUrl = document
                            .getElementById(canvasIdAfterCrop)
                            .toDataURL("image/jpeg");
                    });
            })
            .catch((err) => {
                console.log("error in croping face - ", err);
                let imgUrl = document
                    .getElementById(canvasId)
                    .toDataURL("image/jpeg");
            });
    };

    // START WITH IMAGE PROCESSING
    const sendVideoCanvasImage = () => {
        let video = document.getElementById("inputVideo");
        let canvas = document.getElementById("rdcpup_camera_canvas");
        rdcpupImageOrientation = 1;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        let ctx = canvas.getContext("2d");

        setTimeout(() => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setTimeout(() => {
                let base64imgData = canvas.toDataURL("image/jpeg");
                orientImage(base64imgData)
                    .then((imgData) => {
                        analyzeImage("rdcpup_camera_canvas");
                    })
                    .catch((err) => {
                        console.log(
                            "error in orientating image - using original",
                            err
                        );
                        analyzeImage("rdcpup_camera_canvas");
                    });
            }, 10);
        }, 10);
    };

    // START WITH DETECTION
    const onplay = async () => {
        const video = document.getElementById("inputVideo");
        if (!video) return;

        try {
            adjustOvalSize();
        } catch (err) {
            console.error(err);
        }

        let options = getFaceDetectorOptions();
        let faces;

        try {
            faces = await faceapi
                .detectAllFaces(video, options)
                .withFaceLandmarks();
        } catch (errorDetectFace) {
            console.error("Unable to detect face", errorDetectFace);
        }

        if (faces.length > 0) {
            if (faces.length > 1) {
                document.getElementById("detectionHint").innerHTML =
                    constants.detectionErrors.multi_face;
            } else {
                let result = faces[0];
                let leftEyePoint = result.landmarks.getLeftEye()[0];
                let faceBox = result.alignedRect._box;

                let cameraHint = checkFaceInImage(result);
                let eyeMovement =
                    Math.sqrt(
                        Math.pow(leftEyePoint._x - lastEyePosition._x, 2) +
                            Math.pow(leftEyePoint._y - lastEyePosition._y, 2)
                    ) / faceBox._width;
                if (cameraHint == constants.detectionDict.perfect) {
                    if (initalCaptureDelay > 2000) {
                        resultsCounter++;
                    }
                    if (eyeMovement > 0.1) {
                        resultsCounter = 0;
                    }
                } else {
                    resultsCounter = 0;
                }
                lastEyePosition = leftEyePoint;
                document.getElementById("detectionHint").innerHTML = cameraHint;
                if (resultsCounter == 5) {
                    sendVideoCanvasImage();
                }
            }
        } else {
            document.getElementById("detectionHint").innerHTML =
                constants.detectionDict.noFace;
            resultsCounter = 0;
        }
        initalCaptureDelay += 500;
    };

    // EFFECTS
    useEffect(() => {
        // startVideo()
        initialize();
    }, []);

    useEffect(() => {
        handleVideoCallState();
    }, [callObject]);

    useEffect(() => {
        if (shouldStopVideo) {
            // stopVideo()
        }
    }, [shouldStopVideo]);

    useEffect(() => {
        if (concerns.length > 0) {
            let session_id = callState.callItems.local.session_id;
            firebase
                .firestore()
                .collection("detection_data")
                .doc(
                    `${roomName.replace(
                        new RegExp(" ", "g"),
                        "-"
                    )}-${session_id}`
                )
                .set({ concern: concerns });
        }
    }, [concerns]);

    useEffect(() => {
        let countParticipants = 1;
        for (const [key, value] of Object.entries(callState.callItems)) {
            if (key != "local") {
                listenForChanges(value.session_id);
                countParticipants++;
            }
        }
        if (countParticipants == 1) {
            setHostConcerns([]);
        }
    }, [callState]);

    return (
        <>
            <canvas
                className="rdcpup_canvas"
                id="rdcpup_camera_canvas"
            ></canvas>
            <canvas
                className="rdcpup_canvas"
                id="rdcpup_camera_canvas_overlay"
            />
            <canvas className="rdcpup_canvas" id="rdcpup_dehydration_canvas" />
            <canvas className="rdcpup_canvas" id="rdcpup_dark_circles_canvas" />

            <div className="App">
                <div className={`camera-container`}>
                    <div
                        className={`p-rel`}
                        style={{ width: "100%", height: "100%" }}
                    >
                        <div className="videoCallContainer child-vert-end flex-wrap">
                            <CallObjectContext.Provider value={callObject}>
                                {showCall && (
                                    <Call
                                        roomUrl={roomUrl}
                                        callState={callState}
                                        dispatch={dispatch}
                                        // hostConcern={() =>
                                        //     renderCards(hostConcerns)
                                        // }
                                        // participantConcern={() =>
                                        //     renderCards(concerns)
                                        // }
                                        hostConcern={hostConcerns}
                                        participantConcern={concerns}
                                    />
                                )}
                                <Tray
                                    disabled={!enableCallButtons}
                                    onClickLeaveCall={startLeavingCall}
                                />
                            </CallObjectContext.Provider>
                        </div>
                    </div>
                </div>
                <div
                    className={`w-full child-vert-center  ${css(styles.h10vh)}`}
                    align="center"
                >
                    <div className={`w-full`}>
                        <input
                            type="text"
                            placeholder="Enter Your Room Name"
                            className="flex-1 appearance-none rounded shadow p-3 text-sm text-grey-dark focus:outline-none sm:w-full md:w-3/12"
                            onChange={(e) => setRoomName(e.target.value)}
                        />
                        <button
                            disabled={!enableStartButton}
                            type="submit"
                            className="ml-2 appearance-none bg-indigo-700 text-white text-sm font-semibold tracking-wide uppercase p-3 rounded shadow hover:bg-indigo-300 sm:w-full md:w-1/12"
                            onClick={() => createRoom(roomName)}
                        >
                            Get started
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Home;

const styles = StyleSheet.create({
    template: {
        "@media (min-width: 540px)": {
            marginTop: "20px",
        },
        "@media (max-width: 540px)": {
            marginTop: "0px",
        },
    },
    h10vh: {
        height: "10vh",
    },
});
