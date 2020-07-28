import React, { Component, useEffect, useState, useRef } from 'react';
import { StyleSheet, css } from 'aphrodite';
import * as faceapi from 'face-api.js';
import * as helper from '../../constants/helper'

// STYLE
import './Home.css';

// COMPONENTS IMPORT

// API CALL IMPORT
import * as ApiCall from '../../constants/ApiCall'

function Home(props) {
    // CONSTANTS

    // INITIALIZE

    // STATE
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [currentStream, setCurrentStream] = useState(null)
    const [videoDims, setVideoDims] = useState(null)
    const [videoDetectionInterval, setDetectionInterval] = useState(null)
    const [mediaDevices, setMediaDevices] = useState([])

    // METHODS
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
        async function loadModels() {
            if (await helper.loadModels()) {
                let detectionInterval = setInterval(() => {
                    if(helper.stopVideo){
                        stopVideo()
                    }
                    else{
                        helper.onplay()
                    }
                }, 500)
                setDetectionInterval(detectionInterval)
            }
        }
        loadModels()
    }, [])

    return (
        <div className="App">
            <div id="dml_fmc_wrapper" style={{width: '100%'}}>
        <div id="fmcBody" style={{opacity: 1, height: '769.65px', paddingBottom: '0px'}} className="fmc-desktop-screen2-background fmc-non-landing-bg">
          {/*div id="fmc_background_lines"></div*/}
          <div id="fmc_fixed_chat_button" onclick="openChat()" style={{display: 'none'}}>
            <span id="fmc_fixed_chat_button_text">discuss with a therapist</span>
          </div>
          <a id="fmc_dermDotComAddBagIcon" href="https://www.dermalogica.com/on/demandware.store/Sites-Dermalogica-Site/default/Cart-Show">
            <p>0</p>
          </a>
          <div id="fmcBackgroundDarkenOverlay" style={{height: '100%'}} />
          <div id="fmc_legalConsentOverlay" className="fmc_legalconsentoverlay" style={{opacity: 0, display: 'none'}}>
            <div className="fmc-legaltext-container">
              <p id="legal_text_top">This app collects, stores and processes information and photos of your face and skin, along with descriptions
                of skin health conditions, concerns, and product recommendations. This information is collected by
                Dermalogica, LLC and is required for the app to work. Your data will not be seen by other users.</p>
              <p id="legal_text_consent">I am 18+ years old and I consent to Dermalogica, LLC processing my information to provide the app service
                to me as explained above. I understand that my response will be remembered by this application and
                my data will be treated in accordance with Unilever policy.</p>
              <div id="fmc_consent_accept_button" onclick="fmcConsentClicked()" className="button_has_consent_text">I consent</div>
              <div className="fmc_consent_sep_line" />
              <p id="legal_text_bottom">If you do not want to provide your personal data, then you should not use this app because it is required
                for the app to function. To find out more about how we process your personal information and your
                rights, please see our Privacy Policy
                <a onclick="event.stopPropagation()" href="https://www.unileverprivacypolicy.com/en_us/policy.aspx">here</a> and Terms and Conditions
                <a onclick="event.stopPropagation();" href="http://www.unileverus.com/terms/termsofuse.html">here.</a>
              </p>
              <div id="fmc_close_consent_button" onclick="fmcCancelLegalContent()" />
            </div>
          </div>
          {/*div id="dmlfmcwgt_GlobalContainer" class="fmc-global-container"*/}
          {/* TITLE SCREEN */}
          <div id="fmc_screen1" className="fmc_screen fmc_invisible" style={{height: '629px'}}>
            <div id="fmc_landing_dermalogica_logo">
              <img src="https://facemapping.me/img/dermlogo.png" />
            </div>
            <div id="fmc_ulta_branding">
              <p id="fmc_partnership_ulta_text">in partnership with</p>
              <div id="fmc_ulta_logo" />
            </div>
            <div id="fmc_landing_inner_container">
              <div className="fmc_language_dropdrown_wrapper">
                <select id="fmc_languageSelector">
                  <option value="ar">العربية</option>
                  <option value="cs">Česky</option>
                  <option value="da">Dansk</option>
                  <option value="de">Deutsch</option>
                  <option value="el">Ελληνικά</option>
                  <option value="en" selected="selected">English</option>
                  <option value="en-NZ">English(NZ)</option>
                  <option value="es">Español</option>
                  <option value="et">Eesti</option>
                  <option value="fi">Suomi</option>
                  <option value="fr">Français</option>
                  <option value="he">עברית</option>
                  <option value="hi">हिन्दी</option>
                  <option value="hr">Hrvatski</option>
                  <option value="it">Italiano</option>
                  <option value="ja">日本語</option>
                  <option value="km">ភាសាខ្មែរ</option>
                  <option value="ko">한국어</option>
                  <option value="lv">Latvian</option>
                  <option value="my">မြန်မာစာ</option>
                  <option value="nb">Norsk (bokmål)</option>
                  <option value="nl">Nederlands</option>
                  <option value="pl">Polski</option>
                  <option value="pt">Português</option>
                  <option value="ru">Русский</option>
                  <option value="sl">Slovenščina</option>
                  <option value="sv">Svenska</option>
                  <option value="th">ไทย / Phasa Thai</option>
                  <option value="tr">Türkçe</option>
                  <option value="vi">Việtnam</option>
                  <option value="zh-hans"> 汉语</option>
                  <option value="zh-hant"> 漢語</option>
                </select>
              </div>
              <h1 id="fmc_app_title">face mapping</h1>
              <div id="fmc_landing_line" />
              <p id="fmc_app_tagline">a professional skin analysis</p>
              <p id="fmc_start_button" className="fmc-main-button" onclick="fmcFirstButtonClicked()" style={{opacity: 1, pointerEvents: 'all'}}>analyze your skin</p>
              <a id="fmc_manageCookiebotLink" href="javascript:CookieConsent.show();">manage cookies</a>
            </div>
            <div id="fmc_landing_analysis_container" style={{top: '52.9796%'}}>
              <p id="fmc_landing_analysis_text">smart skin analysis</p>
              <div id="fmc_landing_analysis_set1" className="fmc-landing-set-container">
                <p id="fmc_landing_anaylsis_set1_title" className="fmc-landing-analysis-title">wrinkles</p>
                <p className="fmc-landing-analysis-number">92%</p>
              </div>
              <div id="fmc_landing_analysis_set2" className="fmc-landing-set-container">
                <p id="fmc_landing_anaylsis_set2_title" className="fmc-landing-analysis-title">breakout activity</p>
                <p className="fmc-landing-analysis-number">12%</p>
              </div>
              <div id="fmc_landing_analysis_set3" className="fmc-landing-set-container">
                <p id="fmc_landing_anaylsis_set3_title" className="fmc-landing-analysis-title">pigmentation</p>
                <p className="fmc-landing-analysis-number">43%</p>
              </div>
            </div>
          </div>
          {/* END TITLE SCREEN */}
          {/* SLIDE SCREEN */}
          <div id="fmc_screen2" className="fmc_screen fmc_invisible">
            <div className="fmc_inner-container">
              <div style={{position: 'absolute', width: '30px', height: '30px', top: 0, left: 0, zIndex: 100}} onclick="skipToResults()" />
              <div className="skip-transparent">
                <div id="fmc_skip_intro_button" onclick="skipIntro()">skip intro</div>
              </div>
              <div id="fmc_onboarding_animation_container" className="onboarding-animation-container">
                <div className="onboarding-svg-wrapper" id="fmc_onboarding_svg_wrapper">
                  <svg version="1.1" id="svgCanvas" width="100%" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="-385 -100 962.5 260">
                    <style type="text/css" dangerouslySetInnerHTML={{__html: "\n                                    .dropletst0 {\n                                        opacity: 0.298;\n                                        fill: #248DAE;\n                                    }\n\n                                    .dropletst1 {\n                                        fill: #FFC17E;\n                                    }\n\n                                    .dropletst2 {\n                                        fill: #FFFFFF;\n                                    }\n\n                                    .dropletst3 {\n                                        opacity: 0.298;\n                                        fill: #FFFFFF;\n                                    }\n\n                                    .dropletst4 {\n                                        fill: #7FCFD8;\n                                    }\n                                " }} />
                    <g id="fmc_onboarding_grouped_icon">
                      <ellipse id="dropletShadow" className="dropletst0" cx="96.2" cy="147.4" rx="96.2" ry="12.6" />
                      <g id="dropletOrangeIcon">
                        <path className="dropletst1" d="M122.9,31.5c0,7.2,5.8,13,13,13c7.2,0,13-5.8,13-13s-5.8-13-13-13C128.7,18.5,122.9,24.3,122.9,31.5" />
                        <path className="dropletst2" d="M127.9,31.5h2.2l5.8,3l5.8-3h2.2l-8,4L127.9,31.5z" />
                        <path className="dropletst2" d="M127.9,28.5l8-4l8,4l-8,4L127.9,28.5z" />
                        <path className="dropletst2" d="M135.9,37.5l5.8-3h2.2l-8,4l-8-4h2.2L135.9,37.5z" />
                      </g>
                      <g id="droplet">
                        <path className="dropletst3" d="M132.7,64.9h-0.2c-2.6,0-4.6,1.1-5.9,3c-1.4-1.9-3.5-3-6.1-3s-4.8,1.1-6.1,3c-1.4-1.9-3.5-3-6.1-3s-4.8,1.1-6.1,3c-1.3-1.9-3.5-3-6.1-3c-2.6,0-4.8,1.1-6.1,3c-1.3-1.9-3.5-3-6.1-3s-4.8,1.1-6.1,3c-1.4-1.9-3.5-3-6.1-3s-4.8,1.1-6.1,3c-1.4-1.9-3.5-3-6.1-3c-2.7,0-5.1,1.4-6.4,3.5v16.2c0,2.7,1.4,5.4,3.7,7.1l33.7,24c1.6,1.1,3.5,1.8,5.4,1.8c1.9,0,3.8-0.6,5.4-1.8l33.8-24c2.2-1.6,3.7-4.3,3.7-7.1V68.2C137.7,66.1,135.2,64.9,132.7,64.9z M70.3,76.6c-1.1,0-1.9-1-1.9-1.9c0-1.1,1-1.9,1.9-1.9c1.1,0,1.9,1,1.9,1.9C72.4,75.6,71.5,76.6,70.3,76.6z M78.8,90c-1.1,0-1.9-1-1.9-1.9c0-1,1-1.9,1.9-1.9c1.1,0,1.9,1,1.9,1.9C80.8,89.1,80,90,78.8,90z M87.5,103.5c-1.1,0-1.9-1-1.9-1.9c0-1,1-1.9,1.9-1.9c1.1,0,1.9,1,1.9,1.9C89.4,102.5,88.6,103.5,87.5,103.5z M87.5,76.6c-1.1,0-1.9-1-1.9-1.9c0-1.1,1-1.9,1.9-1.9c1.1,0,1.9,1,1.9,1.9C89.4,75.6,88.6,76.6,87.5,76.6z M96,90c-1.1,0-1.9-1-1.9-1.9c0-1,1-1.9,1.9-1.9c1.1,0,1.9,1,1.9,1.9C97.9,89.1,97.1,90,96,90z M104.6,103.5c-1.1,0-1.9-1-1.9-1.9c0-1,1-1.9,1.9-1.9c1.1,0,1.9,1,1.9,1.9C106.6,102.5,105.8,103.5,104.6,103.5z M104.6,76.6c-1.1,0-1.9-1-1.9-1.9c0-1.1,1-1.9,1.9-1.9c1.1,0,1.9,1,1.9,1.9C106.6,75.6,105.8,76.6,104.6,76.6z M113.3,90c-1.1,0-1.9-1-1.9-1.9c0-1,1-1.9,1.9-1.9c1.1,0,1.9,1,1.9,1.9C115.2,89.1,114.3,90,113.3,90z M121.8,76.6c-1.1,0-1.9-1-1.9-1.9c0-1.1,1-1.9,1.9-1.9c1,0,1.9,1,1.9,1.9C123.7,75.6,122.9,76.6,121.8,76.6z" />
                        <path className="dropletst2" d="M135.7,47.6c-1.1,0-2.1-0.2-3-0.3v37.3c0,0.8-0.3,1.6-1.1,2.1l-33.8,24c-1,0.6-2.2,0.6-3.4,0l-33.8-24c-0.6-0.5-1.1-1.3-1.1-2.1V33.8c0-0.8,0.3-1.6,1.1-2.1l33.7-24c0.5-0.3,1.1-0.5,1.8-0.5s1.1,0.2,1.8,0.5L119.4,23c1-1.8,2.4-3.4,4-4.8L101.6,2.7c-3.4-2.2-7.7-2.2-10.9,0l-33.8,24c-2.2,1.6-3.7,4.3-3.7,7.1v50.8c0,2.7,1.4,5.4,3.7,7.1l33.7,24c1.6,1.1,3.5,1.8,5.4,1.8c1.9,0,3.8-0.6,5.4-1.8l33.8-24c2.2-1.6,3.7-4.3,3.7-7.1V47.2C138,47.4,136.8,47.6,135.7,47.6z" />
                      </g>
                      <path id="dropletBigCircleLeft" className="dropletst4" d="M48.4,21.3c2.7,0,4.8-2.2,4.8-4.8c0-2.7-2.2-4.8-4.8-4.8c-2.7,0-4.8,2.2-4.8,4.8 C43.6,19.2,45.8,21.3,48.4,21.3z" />
                      <path id="dropletBigCircleRight" className="dropletst4" d="M157.2,66.8c2.7,0,4.8-2.2,4.8-4.8c0-2.7-2.2-4.8-4.8-4.8s-4.8,2.2-4.8,4.8 C152.4,64.6,154.5,66.8,157.2,66.8z" />
                      <path id="dropletSmallCircle1" className="dropletst4" d="M33.1,104.1c1.3,0,2.4-1.1,2.4-2.4s-1.1-2.4-2.4-2.4c-1.3,0-2.4,1.1-2.4,2.4	S31.8,104.1,33.1,104.1z" />
                      <path id="dropletSmallCircle2" className="dropletst4" d="M16.5,13.3c1.3,0,2.4-1.1,2.4-2.4s-1.1-2.4-2.4-2.4c-1.4-0.1-2.5,1-2.5,2.3 C14,12.2,15.1,13.3,16.5,13.3z" />
                      <path id="dropletSmallCircle3" className="dropletst4" d="M171.6,26.5c1.3,0,2.4-1.1,2.4-2.4s-1.1-2.4-2.4-2.4c-1.3,0-2.4,1.1-2.4,2.4	C169.2,25.4,170.3,26.5,171.6,26.5z" />
                      <path id="dropletSmallCircle4" className="dropletst4" d="M170.4,103.5c1.3,0,2.4-1.1,2.4-2.4s-1.1-2.4-2.4-2.4c-1.3,0-2.4,1.1-2.4,2.4 S169.1,103.5,170.4,103.5z" />
                      <path id="dropletRingLeft" className="dropletst4" d="M23.7,65.2c1.6,0,2.8,1.3,2.8,2.8c0,1.6-1.3,2.8-2.8,2.8s-2.8-1.3-2.8-2.8	C20.9,66.4,22.1,65.2,23.7,65.2 M23.7,63.2c-2.7,0-4.8,2.2-4.8,4.8s2.2,4.8,4.8,4.8s4.8-2.2,4.8-4.8S26.4,63.2,23.7,63.2L23.7,63.2z" />
                      <path id="dropletRingRight" className="dropletst4" d="M126.5,3.8c1.9,0,3.4,1.5,3.4,3.4s-1.5,3.4-3.4,3.4s-3.4-1.5-3.4-3.4	C123.1,5.3,124.6,3.8,126.5,3.8 M126.5,1.8c-3,0-5.4,2.4-5.4,5.4s2.4,5.4,5.4,5.4s5.4-2.4,5.4-5.4S129.5,1.8,126.5,1.8L126.5,1.8z" />
                    </g>
                  </svg>
                </div>
                <div id="fmc_onboarding_text_container">
                  <h2 id="fmc_onboarding_headline" style={{opacity: 1}}>healthy skin begins with knowledge</h2>
                  <p id="fmc_onboarding_text" style={{opacity: 1}}>Your skin is like no one else’s. Our personalized assessment gives you the insight into your
                    skin’s unique needs that will enable you to make smarter, more effective decisions when it
                    comes to your skin care.</p>
                </div>
              </div>
              <div className="fmc_onboarding_control_buttons">
                <div id="fmc_onboarding_back_button_container" className="slideshow-button prev-button fmc-main-button onboarding-inactive-button" onclick="onboardingPrevSlide();">
                  <div className="arrow-container prev-arrow-container">
                    <img src="https://facemapping.me/img/prev-arrow.png" />
                  </div>
                  <div id="fmc_onboarding_back_button">back</div>
                </div>
                <div id="fmc_onboarding_next_button_container" className="slideshow-button next-button fmc-main-button" onclick="onboardingNextSlide();">
                  <div id="fmc_onboarding_next_button">next</div>
                  <div className="arrow-container next-arrow-container">
                    <img src="https://facemapping.me/img/next-arrow.png" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* END SLIDE SCREEN */}
          {/* IMAGE CAPTURE SCREEN */}
          <div id="fmc_screen3" className="fmc_screen" style={{opacity: 1}}>
            <h2 id="fmc_test_output" style={{position: 'fixed', top: '10px', left: '10px'}} />
            <canvas id="fmc_camera_canvas" />
            <canvas id="fmc_camera_canvas_overlay" />
            <canvas id="fmc_dehydration_canvas" />
            <canvas id="fmc_redness_canvas" />
            <canvas id="fmc_dark_circles_canvas" />
            <div id="fmc_image_delayed_upload_button" className="fmc_button_inverse" onclick="fmc_clickDelayedCaptureButton()" style={{display: 'none'}}>upload a photo</div>
            <div id="fmc_camera_access_container" style={{display: 'block'}}>
              <div id="fmc_loading_spinner" style={{display: 'none'}}>
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
              </div>
              <div className="fmc_popup_background" id="fmc_camera_hint_popup" onclick="document.querySelector('#fmc_camera_access_container .fmc_popup_close_button').click()">
                <div className="fmc_popup_window">
                  <div className="fmc_popup_header">
                    <div id="fmc_header_camera_hints_icon" className="fmc_popup_header_icon" />
                    <div className="fmc_popup_close_button" onclick="closefmcPopup(event);" />
                  </div>
                  <h2 id="fmc_camera_pupup_title" className="fmc_popup_title">photo tips</h2>
                  <hr className="fmc_popup_sep_line" />
                  <p id="for_best_results_hint1" className="fmc_popup_list_text fmc_checkmark_icon">stand in a well lit area and ensure there are no shadows on your face</p>
                  <p id="for_best_results_hint2" className="fmc_popup_list_text fmc_checkmark_icon">remove your glasses</p>
                  <p id="for_best_results_hint3" className="fmc_popup_list_text fmc_checkmark_icon">align your face in the oval</p>
                </div>
              </div>
              <div id="fmc_camera_page_camera_container" style={{opacity: 1, height: '450px'}}>
                <div style={{position: 'relative'}} className="margin">
                  <video onplay="onPlay(this)" id="fmcInputVideo" playsInline autoPlay muted />
                  <div id="fmc_video_oval_mask" style={{height: '450px', backgroundSize: '750px'}} />
                  <p id="fmc_camera_hint_message">sorry we could not detect your face</p>
                  <div id="fmc_camera_capture_action_button" onclick="fmcManualCapture()" style={{display: 'none'}} />
                </div>
              </div>
            </div>
            <div id="fmc_camera_denied_container">
              <div id="fmc_upload_parts" style={{display: 'block'}}>
                <input id="fmc_imageUploadInput" type="file" name="fmc_imageUploadInput" onchange="fmc_uploadImage()" capture="user" />
                <p id="fmc_no_camera_info">We cannot detect or were not given permissions to your camera. Please enable permissions or upload
                  a photo using the button below.</p>
                <div id="fmc_image_upload_button" className="fmc_button_inverse" onclick="fmc_clickFileUploadButton()">upload a photo</div>
              </div>
              <p>
                <span id="fmc_upload_message" style={{display: 'none'}}>uploading...</span>
              </p>
              <div id="fmc_user_orientation_container">
                <div id="fmc_user_orientation_wrapper">
                  <div id="fmc_user_orientation_screen" />
                  <div id="fmc_user_orientation_guide" />
                  <div id="fmc_user_orientation_toolbar">
                    <p id="fmc_user_orientation_hint" onclick="fmcRedoCapture();">If necessary, please rotate your selfie so it is upgright.</p>
                    <div id="fmc_user_orientation_toolbar_buttons">
                      <div id="fmc_user_orientation_redo" className="fmc_user_orientation_toolbar_elements" onclick="fmcRedoCapture();">redo</div>
                      <div id="fmc_user_orientation_rotate" className="fmc_user_orientation_toolbar_elements" onclick="fmcRotateImage();">rotate</div>
                      <div id="fmc_user_orientation_done" className="fmc_user_orientation_toolbar_elements" onclick="fmcConfirmOrientation();">done</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="fmc_android_app_capture_popup">
              <div id="fmc_android_app_capture_popup_content">
                {/*p id="fmc_android_app_capture_popup_title">Do not upload with camera</p*/}
                <p id="fmc_android_app_capture_popup_text">We are unable to access your camera. Please upload a recent picture to proceed.</p>
                <div id="fmc_android_app_capture_popup_ok" onclick="fmcCloseAndroidCameraCapturePopup()">ok</div>
              </div>
            </div>
          </div>
          {/* END IMAGE CAPTURE SCREEN */}
          {/* LOADING SCREEN */}
          <div id="fmc_screen4" className="fmc_screen fmc_invisible">
            <div id="fmc_loading_analyze_content">
              <div id="fmc_loading_analyze_image">
                <img src="https://facemapping.me/img/fmc_face_analyzing.svg" />
              </div>
              <div id="fmc_loading_analyze_scan_bar" />
              <div style={{height: '40px', marginTop: '10px'}}>
                <p id="fmc_loading_analyze_text">analyzing your skin...</p>
                <p id="fmc_loading_analyze_perc">
                  <span id="fmc_loading_analyze_perc_number">0</span>
                  <span id="fmc_loading_alayze_perc_sign">%</span>
                </p>
              </div>
              <div id="fmc_loading_analyze_progress_bar_bg">
                <div id="fmc_loading_analyze_progress_bar" />
              </div>
            </div>
            <div id="fmc_loading_error_content">
              <div id="fmc_loading_error_image">
                <img src="https://facemapping.me/img/fmc_face_error.svg" />
              </div>
              <p id="fmc_loading_error_text" />
              <div id="fmc_loading_error_button" onclick="retryCapturing()">
                <svg version="1.1" id="fmc_redo_arrow" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 200 200" style={{enableBackground: 'new 0 0 200 200'}} xmlSpace="preserve">
                  <path d="M186.8,107c0,23.9-9.4,46.5-26.5,63.5S120.7,197,96.8,197c-23.9,0-46.5-9.4-63.5-26.5S6.8,130.9,6.8,107
            	c0-49.1,39.9-89.4,88.9-90V7.2c0-3.3,3.6-5.4,6.5-3.8l36.7,21.2c2.9,1.7,2.9,5.8,0,7.5l-36.7,21.2c-2.9,1.7-6.5-0.4-6.5-3.7v-9.1
            	C59.6,41.1,30.3,70.8,30.3,107c0,37.8,31.7,68.3,69.9,66.4c34.9-1.7,62.8-30.7,63.2-65.7c0.1-8.4-1.4-16.6-4.3-24.4l21.9-8.3
            	C184.8,85.3,186.8,96,186.8,107z" />
                </svg>
              </div>
            </div>
            <div id="fmc_high_traffic_mode_container">
              <div id="fmc_high_traffic_mode_content">
                <div id="fmc_high_traffic_mode_image">
                  <img src="https://facemapping.me/img/high_traffic_icon.svg" />
                </div>
                <p id="fmc_high_traffic_mode_text">Wow! We’re getting insane traffic from that recent Instagram story. 🙂 Just drop us your email, and
                  we’ll send you your results once they’ve processed 😉</p>
              </div>
              <div id="fmc_high_traffic_mode_email_wrapper">
                <div id="fmc_high_traffic_mode_email" />
              </div>
            </div>
          </div>
          {/* END LOADING SCREEN */}
          {/* RESULTS SCREEN */}
          <div id="fmc_screen5" className="fmc_screen fmc_invisible">
            <div id="fmc_nav_bar">
              <a href="/">
                <div className="fmc-logo">
                  <img src="https://facemapping.me/img/dermlogo-desktop.png" />
                </div>
              </a>
              <div id="fmc_nav_menu">
                <ul>
                  <li>
                    <a id="fmc_nav_menu_meet_derm" href="https://www.dermalogica.com/on/demandware.store/Sites-Dermalogica-Site/default/Page-Show?fdid=aboutUs">Meet Dermalogica</a>
                  </li>
                  <li>
                    <a id="fmc_nav_menu_where_buy" href="https://www.dermalogica.com/on/demandware.store/Sites-Dermalogica-Site/default/Home-Show">Where to buy</a>
                  </li>
                  <li>
                    <a id="fmc_nav_menu_contact_us" href="https://www.dermalogica.com/contact-us/contact-us,default,pg.html">Contact us</a>
                  </li>
                </ul>
              </div>
              <div id="fmc_hamburger_menu" onclick="fmcOpenHambugerMenu();" />
              <div id="fmc_mobile_menu">
              </div>
            </div>
            <div id="fmc_results_section" className="fmc-section-container">
              <div id="fmc_results_wrapper">
                <div id="fmc_results_image_concerns_wrapper">
                  <div id="fmcResultImageContainer">
                    <div id="fmc_result_images_array_wrapper">
                    </div>
                    {/* <div id="fmc_frozen_glass_image_part_results" /> */}
                    
                  </div>
                  <div id="fmc_statistics_container">
                    <div id="fmc_statistics_container_head" className="fmc-result-containers-head" onclick="fmcSecretlyActivateFullScreenIcons()">
                      <p id="fmc_statistics_container_tagline_1" className="fmc-containers-tagline-1">your targeted</p>
                      <p id="fmc_statistics_container_tagline_2" className="fmc-containers-tagline-2">skin concerns</p>
                    </div>
                    <div id="fmc_concern_items">
                    </div>
                  </div>
                  {/* end statistics-container */}
                </div>
                <div id="fmc_kit_container">
                  <div id="fmc_kit_container_head">
                    <p id="fmc_kit_tagline_1" />
                    <p id="fmc_kit_tagline_2" />
                  </div>
                  {/*p id="recommended_container_based_on_info_text">Based on <span class="condition">dark circles</span> and <span class="condition">acne</span> you're experiencing, we recommend incorporating the below products into your skin routine. We think you'll love them!</p*/}
                  <div id="fmc_chosen_kit_image" />
                  <p id="fmc_chosen_kit_title" />
                  <p id="fmc_chosen_kit_tagline" />
                  <a id="fmc_kit_buy_button" target="_blank">
                    <p id="fmc_kit_buy_button_text" />
                  </a>
                </div>
              </div>
              <div id="fmc_results_wrapper_mobile">
                <div id="fmcCarousel_mobileResults">
                </div>
                <div id="fmc_mobile_results_products_container">
                </div>
                <div id="fmc_results_mobile_next_button" onclick="dmlCarousel.prevCard('fmcCarousel_mobileResults')" className="fmc-product-carousel-button">
                  <div className="fmc-arrow-icon fmc-arrow-right" />
                </div>
                <div id="fmc_results_mobile_prev_button" onclick="dmlCarousel.nextCard('fmcCarousel_mobileResults')" className="fmc-product-carousel-button">
                  <div className="fmc-arrow-icon fmc-arrow-left" />
                </div>
              </div>
            </div>
            <div id="fmc_coupon_container" className="fmc-section-container">
              <p id="fmc_coupon_text">20% Face Mapping Rabatt mit Code
                <b>FM20</b> auf dermalogica.de</p>
            </div>
            
            <div id="fmc_main_chat_container" className="fmc-section-container" style={{display: 'none'}}>
              <div id="fmc_chat_container_icon" onclick="openChat()" />
              <p id="fmc_chat_container_question">Have a question? We’re here to help!</p>
              <p id="fmc_chat_container_tagline">chat with a certified skin therapist</p>
              <p id="fmc_chat_container_button" onclick="openChat()">live chat</p>
            </div>
            <div id="fmc_msk_banner" onclick="fmcSendGA(&quot;mainFlow&quot;,&quot;MSK banner clicked&quot;);">
              <a href="https://myskinkit.com/" target="_blank">
                <img src="https://facemapping.me/img/fmc_msk_banner.jpg" />
              </a>
            </div>
            <div id="fmc_product_carousel_container">
              <div id="fmc_product_carousel_main_icon" className="fmc-section-icons" />
              <p id="fmc_product_carousel_tagline_1" className="fmc-containers-tagline-1">6-step regimen</p>
              <p id="fmc_product_carousel_tagline_2" className="fmc-containers-tagline-2">complete your regimen</p>
              <div id="fmc_product_carouse_info_text_wrapper">
                <span id="fmc_product_carousel_info_text_1">Along with using a targeted treatment for your</span>
                <span id="fmc_carousel_concern_focus" />
                <span id="fmc_product_carousel_info_text_2">, layer these products in the following order for optimal results.</span>
              </div>
              <div id="fmc_product_carousel_slider">
                <div id="fmc_product_carousel_section">
                </div>
                <div id="fmc_product_carousel_left_button" className="fmc-product-carousel-button" onclick="carouselNextProduct()">
                  <div className="fmc-arrow-icon fmc-arrow-left" />
                </div>
                <div id="fmc_product_carousel_right_button" className="fmc-product-carousel-button" onclick="carouselPrevProduct()">
                  <div className="fmc-arrow-icon fmc-arrow-right" />
                </div>
              </div>
            </div>
            <div id="fmc_extra_banner_container">
            </div>
          </div>
          {/* END RESULTS SCREEN */}
          <div id="fmc_cta_popup_wrapper">
            <div id="fmc_cta_popup">
              <p id="fmc_popup_email_success" className="fmc-email-submit-response-message" />
              <p id="fmc_popup_email_error" className="fmc-email-submit-response-message" />
              <div id="fmc_cta_form_wrapper">
                <div>
                  <p id="fmc_cta_popup_email_title" />
                  <p id="fmc_cta_popup_email_subtitle">Please enter your email to view your results</p>
                  <div id="fmc_cta_popup_email_input">
                    <input type="text" required="true" id="fmc_cta_popup_email" name="email" onchange="mirrorEmail(event)" placeholder="Enter your email" />
                  </div>
                  <p id="fmc_cta_popup_email_faulty_email_text">please enter a valid email address</p>
                  <div id="fmc_cta_popup_checkbox_wrapper">
                    <input id="fmc_popup_checkbox" name="out_of_form_checkbox" type="checkbox" onchange="updateSubscribe(event);" />
                    <span id="fmc_cta_popup_subscribe_checkbox_label">Send me Dermalogica product updates and discounts, too!</span>
                  </div>
                  <div id="fmc_cta_popup_email_button" className="fmc_inactive" value="Send" onclick="clickEmailSubmitButton();" />
                </div>
              </div>
              <div id="fmc_cta_popup_derm_d_icon" />
              <div className="fmc_nykaa_email_button" onclick="fmcNykaaEmailButtonClicked()">Get Offer</div>
            </div>
          </div>
          <div id="fmc_fullScreenToggleIcon" onclick="fmcToggleFullscreen();" style={{left: 'unset', right: '10px'}} />
        </div>
        {/*/div*/}
        {/*script src="https://facemapping.me/fmcembed.js"></script*/}
        <link id="fmcStyleSheet" rel="stylesheet" type="text/css" href="https://facemapping.me/stylesheets/style.min.css?1595587785808" media="all" />
      </div>
        </div>
    )
}

export default Home1;

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