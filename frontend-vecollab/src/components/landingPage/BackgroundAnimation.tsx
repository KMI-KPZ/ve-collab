import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { type ISourceOptions, MoveDirection, OutMode } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

interface IBackgroundAnimationProps {
    className: string;
    enable: Boolean;
}

export default function BackgroundAnimation({ className, enable }: IBackgroundAnimationProps) {
    const [init, setInit] = useState<Boolean>(false);

    // this should be run only once per application lifetime
    useEffect(() => {
        initParticlesEngine(async (engine) => {
            // you can initiate the tsParticles instance (engine) here, adding custom shapes or presets
            // this loads the tsparticles package bundle, it's the easiest method for getting everything ready
            // starting from v2 you can add only the features you need reducing the bundle size
            await loadSlim(engine);
        }).then(() => {
            setInit(enable);
        });
    }, [enable]);

    const options: ISourceOptions = useMemo(
        () => ({
            // if not set -> transparent background
            background: {
                "image": "url('/images/BG_Frontpage.png')"

            },
            fpsLimit:15,
            interactivity: {
                events: {
                    onClick: {
                        enable: true,
                        mode: 'push',
                    },
                    onHover: {
                        enable: false,
                        mode: 'repulse',
                    },
                },
                modes: {
                    push: {
                        quantity: 1,
                    },
                    repulse: {
                        distance: 50,
                        duration: 0.4,
                    },
                },
            },
            particles: {
                color: {
                    value: '#93d1e0',
                },
                links: {
                    color: '#93d1e0',
                    distance: 150,
                    enable: true,
                    width: 1,
                },
                move: {
                    direction: MoveDirection.none,
                    enable: true,
                    outModes: {
                        default: OutMode.out,
                    },
                    random: false,
                    speed: 0.2,
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                    },
                    value: 80,
                },
                shape: {
                    type: 'circle',
                },
                size: {
                    value: { min: 1, max: 5 },
                },
            },
            detectRetina: true,
        }),
        []
    );

    return init ? <Particles id="tsparticles" options={options} className={className} /> : <></>;
}
