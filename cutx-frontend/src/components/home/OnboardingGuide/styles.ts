// Animation styles for OnboardingGuide

export const animationStyles = `
  @keyframes arrow-bounce-right {
    0%, 100% { transform: translateY(-50%) translateX(0); }
    50% { transform: translateY(-50%) translateX(4px); }
  }
  @keyframes arrow-bounce-left {
    0%, 100% { transform: translateY(-50%) translateX(0); }
    50% { transform: translateY(-50%) translateX(-4px); }
  }
  @keyframes arrow-bounce-down {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(4px); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
  }
  @keyframes file-fly {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.5) rotate(-10deg);
    }
    30% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1) rotate(0deg);
    }
  }
  .animate-arrow-right {
    animation: arrow-bounce-right 1s ease-in-out infinite;
  }
  .animate-arrow-left {
    animation: arrow-bounce-left 1s ease-in-out infinite;
  }
  .animate-arrow-down {
    animation: arrow-bounce-down 1s ease-in-out infinite;
  }
  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }
  .animate-file-fly {
    animation: file-fly 0.8s ease-out forwards;
  }
`;
