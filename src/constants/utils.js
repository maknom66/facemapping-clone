export const STATE_IDLE = "STATE_IDLE";
export const STATE_CREATING = "STATE_CREATING";
export const STATE_JOINING = "STATE_JOINING";
export const STATE_JOINED = "STATE_JOINED";
export const STATE_LEAVING = "STATE_LEAVING";
export const STATE_ERROR = "STATE_ERROR";
export const inputSize = 256
export const scoreThreshold = 0.5
export const detectionErrors = {
    no_face: "Sorry, we could not detect your face. Please try again.",
    multi_face: "Unfortunately, this isn't a group activity--you need to take the photo alone. Please try again.",
    general: "Please pardon the interruption of your experience, but our application has encountered an error. Our developers are hard at work to prevent this happening again. Please try again."
}
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
    perfect: "\u2705 Perfect - hold still please"
}
export let curImgData;
export let fmcDehydrImgUrl = "";
export let fmcDarkCircImgUrl = "";
export let fmcRednessImgUrl = "";
export let fmcChatStatus = "offline";
export let faceAIsawFace = false;
export let calcDehydrScore = 2;
export let calcDarkCircleScore = 2;
export let ovalInterval;
export let imageSent = false;
export let fmc_runStream = true;
export let camFaceDirection = true;
export let mediaStream;
export let fmc_showNavbar;
export let fmcManualCaptureFlag = false;
export let lastOnPlayCallTimeout;
export let lastCallTimeoutTimer = 5000;
export let onPlayDelayTimeout;
export let fmcIsOnboardingScreen = false;
export let mobileWidth = 768;
export let fmcOS = "not found";
export let fmc_results_available = false;
export let fmcProductConcernsDone = false;
export let fmcProductCarouselDone = false;
export let pendingUpdateResultsCounter = 0;
export let fmcMaxConcerns = 20;
export let carouselSliderAllowsMoving = true;
export let fmcRegimeLabelsOrder = ["precleanse", "cleanse", "exfoliate", "tone", "moisturize", "protect"];
export let fmcSeverityWords = {
    critical: "critical",
    moderate: "moderate"
}
export let fmcMoreLessButtonsText = {
    more: "more",
    less: "less"
}
export let fmcRegimeLabels = {
    precleanse: "precldfsfeanse",
    cleanse: "cleanse",
    exfoliate: "exfoliate",
    soothe: "soothe",
    tone: "tone",
    moisturize: "moisturize",
    protect: "protect"
}
export let fmcProductCards = {
    shop_button: "shop"
}
export let fmcConcernCopy = {
    acne: {
        title: "",
        text: ""
    },
    dark_circles: {
        title: "Dark Circles",
        text: ""
    },
    dehydration: {
        title: "Dehydration",
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