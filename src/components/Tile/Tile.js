import React, { useEffect, useRef } from 'react';
import './Tile.css';

/**
 * Props
 * - videoTrack: MediaStreamTrack?
 * - audioTrack: MediaStreamTrack?
 * - isLocalPerson: boolean
 * - isLarge: boolean
 * - isLoading: boolean
 */
export default function Tile(props) {
    const videoEl = useRef(null);
    const audioEl = useRef(null);

    /**
     * When video track changes, update video srcObject
     */
    useEffect(() => {
        videoEl.current &&
            (videoEl.current.srcObject = new MediaStream([props.videoTrack]));
    }, [props.videoTrack]);

    /**
     * When audio track changes, update audio srcObject
     */
    useEffect(() => {
        audioEl.current &&
            (audioEl.current.srcObject = new MediaStream([props.audioTrack]));
    }, [props.audioTrack]);

    function getLoadingComponent() {
        return props.isLoading && <p className="loading">Loading...</p>;
    }

    function getVideoComponent() {
        return (
            props.videoTrack && <video autoPlay muted playsInline ref={videoEl} id="inputVideo" />
        );
    }

    function getAudioComponent() {
        return (
            !props.isLocalPerson &&
            props.audioTrack && <audio autoPlay playsInline ref={audioEl} />
        );
    }

    function getClassNames() {
        let classNames = 'tile small';
        // classNames += props.isLarge ? ' large' : ' small';
        props.isLocalPerson && (classNames += ' local');
        return classNames;
    }

    return (
        <div className={getClassNames()}>
            <div className="background" />
            {getLoadingComponent()}
            {getVideoComponent()}
            {getAudioComponent()}
            {!props.isLarge &&
                <>
                    <div id="inputVideoOvalMask" className="inputVideoOvalMask" style={{ height: '450px', backgroundSize: '750px' }} />
                    <p id="detectionHint">sorry we could not detect your face</p>
                </>
            }
        </div>
    );
}
