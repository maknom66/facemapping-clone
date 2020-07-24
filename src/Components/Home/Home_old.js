import React, { Component, useEffect, useState, useRef } from 'react';
import { StyleSheet, css } from 'aphrodite';
import * as faceapi from 'face-api.js';

// STYLE
import './Home.css';

// COMPONENTS IMPORT

// API CALL IMPORT
import * as ApiCall from '../../constants/ApiCall'

function Home(props) {
    // STATE
    const [currentStream, setCurrentStream] = useState(null)
    const [videoDims, setVideoDims] = useState(null)
    const [videoDetectionInterval, setDetectionInterval] = useState(null)
    const [mediaDevices, setMediaDevices] = useState([])

    // METHODS
    async function detectFace() {
        try {
            // LOAD MODELS
            await faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/models')
            await faceapi.nets.faceExpressionNet.loadFromUri('/assets/models')
            await faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models')
            await faceapi.nets.ageGenderNet.loadFromUri('/assets/models')

            // GET REFERENCE OF MEDIA
            const input = document.getElementById('fmcInputVideo')

            // GET MEDIA DIMENSIONS
            let videoDimRatio = videoDims.width / videoDims.height
            let displaySize = { width: input.width, height: input.width / videoDimRatio }

            // GET ALREADY ADDED CANVAS TO SHOW DETECTIONS
            const canvas = document.getElementById('overlay')

            // DETECT FACES
            const detections = await faceapi.detectAllFaces(input).withFaceLandmarks().withFaceExpressions().withAgeAndGender()
            console.log(detections)
        }
        catch (err) {
            console.error(err)
        }
    }

    const stopMediaTracks = (stream) => {
        stream.getTracks().forEach(track => {
            track.stop();
        });
    }

    const startVideo = async () => {
        try {
            const video = document.getElementById('fmcInputVideo')

            if (currentStream) {
                stopMediaTracks(currentStream);
            }
            const videoConstraints = {
                facingMode: 'user'
            };

            const constraints = {
                video: videoConstraints,
                audio: false
            };

            navigator.mediaDevices
                .getUserMedia(constraints)
                .then(stream => {
                    video.srcObject = stream;
                    let { width, height } = stream.getTracks()[0].getSettings();
                    setCurrentStream(stream)
                    setVideoDims({ width, height })
                    return navigator.mediaDevices.enumerateDevices();
                })
                .then(devices => {
                    setMediaDevices(devices)
                })
                .catch(error => {
                    console.error(error);
                });
        }
        catch (err) {
            console.error(err)
        }
    }

    const stopVideo = () => {
        try {
            const video = document.getElementById('fmcInputVideo')
            let stream = video.srcObject;
            let tracks = stream.getTracks();
            for (let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                track.stop();
            }
            video.srcObject = null;
            clearInterval(videoDetectionInterval);
        }
        catch (err) {
            console.error(err)
        }
    }

    // START RECORDING
    useEffect(() => {
        startVideo()
    }, [])

    // START DETECTING FACE ONCE DIMENSIONS ARE LOADED
    useEffect(() => {
        if (videoDims) {
            const video = document.getElementById('fmcInputVideo')
            video.addEventListener('play', () => {
                let detectionInterval = setInterval(() => {
                    // detectFace()
                }, 100)
                setDetectionInterval(detectionInterval)
            })
        }
    }, [videoDims])

    return (
        <div className="App">
            <div>
                <div className={`camera-container`}>
                    <div className={`p-rel`}>
                        <video id="fmcInputVideo" autoplay="" playsinline="" muted ></video>
                        <div className={`video-val-mask`} style={{ height: '450px', backgroundSize: '750px' }} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home;

const styles = StyleSheet.create({
    template: {
        '@media (min-width: 540px)': {
            marginTop: '20px'
        },
        '@media (max-width: 540px)': {
            marginTop: '0px'
        }
    }
});