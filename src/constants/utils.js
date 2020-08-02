import React from "react";
export const CallObjectContext = () => {
    return React.createContext();
};
export const STATE_IDLE = "STATE_IDLE";
export const STATE_CREATING = "STATE_CREATING";
export const STATE_JOINING = "STATE_JOINING";
export const STATE_JOINED = "STATE_JOINED";
export const STATE_LEAVING = "STATE_LEAVING";
export const STATE_ERROR = "STATE_ERROR";
export const inputSize = 256;
export const scoreThreshold = 0.5;
export const detectionErrors = {
    no_face: "Sorry, we could not detect your face. Please try again.",
    multi_face:
        "Unfortunately, this isn't a group activity--you need to take the photo alone. Please try again.",
    general:
        "Please pardon the interruption of your experience, but our application has encountered an error. Our developers are hard at work to prevent this happening again. Please try again.",
};
export const detectionDict = {
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
    perfect: "\u2705 Perfect - hold still please",
    thankyou: "Your facial biometric scan was successful",
    reposition: "Unable to scan your face, please re-orient your face",
};
export let rdcpupDehydrImgUrl = "";
export let rdcpupDarkCircImgUrl = "";
export let rdcpupRednessImgUrl = "";
export let rdcpupChatStatus = "offline";
export let calcDehydrScore = 2;
export let calcDarkCircleScore = 2;
export let ovalInterval;
export let imageSent = false;
export let rdcpup_runStream = true;
export let camFaceDirection = true;
export let mediaStream;
export let rdcpup_showNavbar;
export let rdcpupManualCaptureFlag = false;
export let lastOnPlayCallTimeout;
export let lastCallTimeoutTimer = 5000;
export let onPlayDelayTimeout;
export let rdcpupIsOnboardingScreen = false;
export let mobileWidth = 768;
export let rdcpupOS = "not found";
export let rdcpup_results_available = false;
export let rdcpupProductConcernsDone = false;
export let rdcpupProductCarouselDone = false;
export let pendingUpdateResultsCounter = 0;
export let rdcpupMaxConcerns = 20;
export let carouselSliderAllowsMoving = true;
export let rdcpupRegimeLabelsOrder = [
    "precleanse",
    "cleanse",
    "exfoliate",
    "tone",
    "moisturize",
    "protect",
];
export let rdcpupSeverityWords = {
    critical: "critical",
    moderate: "moderate",
};
export let rdcpupMoreLessButtonsText = {
    more: "more",
    less: "less",
};
export let rdcpupRegimeLabels = {
    precleanse: "precldfsfeanse",
    cleanse: "cleanse",
    exfoliate: "exfoliate",
    soothe: "soothe",
    tone: "tone",
    moisturize: "moisturize",
    protect: "protect",
};
export let rdcpupProductCards = {
    shop_button: "shop",
};
export let rdcpupConcernCopy = {
    acne: {
        title: "",
        text: "",
    },
    dark_circles: {
        title: "Dark Circles",
        text: "",
    },
    dehydration: {
        title: "Dehydration",
        text: "",
    },
    oiliness: {
        title: "",
        text: "",
    },
    pores: {
        title: "",
        text: "",
    },
    redness: {
        title: "",
        text: "",
    },
    spots: {
        title: "",
        text: "",
    },
    uneven_skintone: {
        title: "",
        text: "",
    },
    wrinkles: {
        title: "",
        text: "",
    },
};
