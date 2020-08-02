import React, { useEffect, useContext, useReducer, useState } from "react";
import { StyleSheet, css } from "aphrodite";
import * as constants from "../../constants/utils";
import "./Call.css";
import Tile from "../Tile/Tile";
import CallObjectContext from "../../constants/CallObjectContext";
import CallMessage from "../CallMessage/CallMessage";
import {
    initialCallState,
    CLICK_ALLOW_TIMEOUT,
    PARTICIPANTS_CHANGE,
    CAM_OR_MIC_ERROR,
    FATAL_ERROR,
    callReducer,
    isLocal,
    isScreenShare,
    containsScreenShare,
    getMessage,
} from "./callState";

// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/swiper.scss";

export default function Call(props) {
    const callObject = useContext(CallObjectContext);
    const callState = props.callState;
    const dispatch = props.dispatch;
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    // const [callState, dispatch] = useReducer(callReducer, initialCallState);

    /**
     * Start listening for participant changes, when the callObject is set.
     */
    useEffect(() => {
        if (!callObject) return;

        const events = [
            "participant-joined",
            "participant-updated",
            "participant-left",
        ];

        function handleNewParticipantsState(event) {
            dispatch({
                type: PARTICIPANTS_CHANGE,
                participants: callObject.participants(),
            });
        }

        // Use initial state
        handleNewParticipantsState();

        // Listen for changes in state
        for (const event of events) {
            callObject.on(event, handleNewParticipantsState);
        }

        // Stop listening for changes in state
        return function cleanup() {
            for (const event of events) {
                callObject.off(event, handleNewParticipantsState);
            }
        };
    }, [callObject]);

    /**
     * Start listening for call errors, when the callObject is set.
     */
    useEffect(() => {
        if (!callObject) return;

        function handleCameraErrorEvent(event) {
            dispatch({
                type: CAM_OR_MIC_ERROR,
                message:
                    (event && event.errorMsg && event.errorMsg.errorMsg) ||
                    "Unknown",
            });
        }

        // We're making an assumption here: there is no camera error when callObject
        // is first assigned.

        callObject.on("camera-error", handleCameraErrorEvent);

        return function cleanup() {
            callObject.off("camera-error", handleCameraErrorEvent);
        };
    }, [callObject]);

    /**
     * Start listening for fatal errors, when the callObject is set.
     */
    useEffect(() => {
        if (!callObject) return;

        function handleErrorEvent(e) {
            dispatch({
                type: FATAL_ERROR,
                message: (e && e.errorMsg) || "Unknown",
            });
        }

        // We're making an assumption here: there is no error when callObject is
        // first assigned.

        callObject.on("error", handleErrorEvent);

        return function cleanup() {
            callObject.off("error", handleErrorEvent);
        };
    }, [callObject]);

    /**
     * Start a timer to show the "click allow" message, when the component mounts.
     */
    useEffect(() => {
        const t = setTimeout(() => {
            dispatch({ type: CLICK_ALLOW_TIMEOUT });
        }, 2500);

        return function cleanup() {
            clearTimeout(t);
        };
    }, []);

    // LISTENER FOR WIDTH CHANGE
    useEffect(() => {
        window.addEventListener("resize", function () {
            setWindowWidth(window.innerWidth);
        });
    }, []);

    const getTiles = () => {
        let largeTiles = [];
        let smallTiles = [];
        Object.entries(callState.callItems).forEach(([id, callItem], index) => {
            const isLarge =
                isScreenShare(id) ||
                (!isLocal(id) && !containsScreenShare(callState.callItems));
            const tile = (
                <Tile
                    key={id}
                    index={index}
                    videoTrack={callItem.videoTrack}
                    audioTrack={callItem.audioTrack}
                    isLocalPerson={isLocal(id)}
                    isLarge={isLarge}
                    isLoading={callItem.isLoading}
                />
            );
            if (isLarge) {
                largeTiles.push(tile);
            } else {
                smallTiles.push(tile);
            }
        });
        return [largeTiles, smallTiles];
    };

    const renderCards = (item) => {
        return (
            <div
                className={`container mx-auto rounded-lg overflow-hidden shadow-lg my-2 bg-white ${css(
                    styles.cardMaxWidth
                )}`}
                style={{ height: "90%" }}
            >
                <div className="relative">
                    <img
                        height={window.innerHeight / 2 / 1.2}
                        style={{
                            maxHeight: window.innerHeight / 2 / 1.7,
                            backgroundSize: "contain",
                        }}
                        className="w-full h-full"
                        src={item.image}
                        alt="Profile picture"
                    />
                    <div
                        className="text-center absolute w-full"
                        style={{ bottom: "-30px" }}
                    >
                        <div className="mb-10">
                            <p className="text-white tracking-wide uppercase text-lg font-bold">
                                {constants.rdcpupConcernCopy[item.name].title}
                            </p>
                        </div>
                        {/* <button className="cardButton p-4 rounded-full transition ease-in duration-200 focus:outline-none">
                                <svg
                                    viewBox="0 0 20 20"
                                    enableBackground="new 0 0 20 20"
                                    className="w-6 h-6"
                                >
                                    <path
                                        fill="#FFFFFF"
                                        d="M16,10c0,0.553-0.048,1-0.601,1H11v4.399C11,15.951,10.553,16,10,16c-0.553,0-1-0.049-1-0.601V11H4.601
                                                C4.049,11,4,10.553,4,10c0-0.553,0.049-1,0.601-1H9V4.601C9,4.048,9.447,4,10,4c0.553,0,1,0.048,1,0.601V9h4.399
                                                C15.952,9,16,9.447,16,10z"
                                    />
                                </svg>
                            </button> */}
                    </div>
                </div>
                <div className="py-2 px-6 text-center tracking-wide grid grid-cols-1">
                    <div className="followers">
                        <p className="text-lg">{item.score}</p>
                        <p className="text-gray-400 text-sm">Score</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderMask = (data) => {
        return data.map((item, index) => {
            return renderCards(item);
        });
    };

    const [largeTiles, smallTiles] = getTiles();
    const message = getMessage(callState);
    return (
        <div className="call w-full">
            {/* <div className="large-tiles">
                {
                    !message
                        ? largeTiles
                        : null 
                }
            </div> 
            */}
            {windowWidth > 540 ? (
                <>
                    <div
                        className={`w-full flex ${css(
                            styles.h50p,
                            styles.sm_hide
                        )}`}
                    >
                        <div className="small-tiles">{largeTiles}</div>
                        <div className="small-tiles">
                            {renderMask(props.hostConcern)}
                        </div>
                    </div>
                    <div
                        className={`w-full flex ${css(
                            styles.h50p,
                            styles.sm_hide
                        )}`}
                    >
                        <div className="small-tiles">{smallTiles}</div>
                        <div className="small-tiles">
                            {renderMask(props.participantConcern)}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div
                        className={`w-full flex ${css(
                            styles.h50p,
                            styles.sm_show
                        )}`}
                    >
                        <Swiper
                            scrollbar={{ draggable: true }}
                            spaceBetween={50}
                            slidesPerView={1}
                            onSlideChange={() => console.log("slide change")}
                            onSwiper={(swiper) => console.log(swiper)}
                            className={"w-full h-full"}
                        >
                            <SwiperSlide>{largeTiles}</SwiperSlide>
                            {props.hostConcern.map((item, index) => {
                                return (
                                    <SwiperSlide>
                                        {renderCards(item)}
                                    </SwiperSlide>
                                );
                            })}
                        </Swiper>
                    </div>
                    <div
                        className={`w-full flex ${css(
                            styles.h50p,
                            styles.sm_show
                        )}`}
                    >
                        <Swiper
                            scrollbar={{ draggable: true }}
                            spaceBetween={50}
                            slidesPerView={1}
                            onSlideChange={() => console.log("slide change")}
                            onSwiper={(swiper) => console.log(swiper)}
                            className={"w-full h-full"}
                        >
                            <SwiperSlide>{smallTiles}</SwiperSlide>
                            {props.participantConcern.map((item, index) => {
                                return (
                                    <SwiperSlide>
                                        {renderCards(item)}
                                    </SwiperSlide>
                                );
                            })}
                        </Swiper>
                    </div>
                </>
            )}
            {message && (
                <CallMessage
                    header={message.header}
                    detail={message.detail}
                    isError={message.isError}
                />
            )}
        </div>
    );
}

const styles = StyleSheet.create({
    sm_show: {
        "@media (min-width: 540px)": {
            display: "none",
        },
    },
    sm_hide: {
        "@media (max-width: 540px)": {
            display: "none",
        },
    },
    cardMaxWidth: {
        "@media (min-width: 540px)": {
            maxWidth: "12em",
        },
        "@media (max-width: 540px)": {
            maxWidth: "10em",
        },
    },
    h50p: {
        height: "50%",
    },
});
