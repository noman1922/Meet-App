import React, { useEffect, useRef } from 'react';

const Call = ({ user }) => {
    const jitsiRef = useRef(null);

    useEffect(() => {
        const domain = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';
        const roomName = import.meta.env.VITE_ROOM_NAME || 'teamspace-main-room';

        const loadJitsiScript = () => {
            return new Promise((resolve) => {
                if (window.JitsiMeetExternalAPI) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = `https://${domain}/external_api.js`;
                script.async = true;
                script.onload = resolve;
                document.body.appendChild(script);
            });
        };

        const initJitsi = async () => {
            await loadJitsiScript();

            const options = {
                roomName: roomName,
                width: '100%',
                height: '100%',
                parentNode: jitsiRef.current,
                userInfo: {
                    displayName: user.displayName
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                        'security'
                    ],
                },
                configOverwrite: {
                    startWithAudioMuted: true,
                    disableDeepLinking: true
                }
            };

            const api = new window.JitsiMeetExternalAPI(domain, options);

            return () => api.dispose();
        };

        initJitsi();
    }, [user]);

    return <div className="jitsi-container" ref={jitsiRef}></div>;
};

export default Call;
