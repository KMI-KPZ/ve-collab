import { useMemo } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { type Engine, type ISourceOptions, MoveDirection, OutMode } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

interface IBackgroundAnimationProps {
    className: string;
    enable: Boolean;
}

async function initEngine(engine: Engine) {
    await loadSlim(engine);
}

export default function BackgroundAnimation({ className, enable }: IBackgroundAnimationProps) {
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
                paint: {
                    fill: {
                        enable: true,
                        color: { value: '#50686e' },
                    },
                },
                links: {
                    color: '#50686e',
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

    if (!enable) return <></>;

    return (
        <ParticlesProvider init={initEngine}>
            <Particles id="tsparticles" options={options} className={className} />
        </ParticlesProvider>
    );
}
