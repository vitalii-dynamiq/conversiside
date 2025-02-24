
import React from 'react';

interface FooterProps {
  showContactSupport: boolean;
  onContactSupport?: () => void;
  contactSupportUrl?: string;
  contactSupportEmail?: string;
}

export const Footer: React.FC<FooterProps> = ({
  showContactSupport,
  onContactSupport,
  contactSupportUrl,
  contactSupportEmail,
}) => {
  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else if (contactSupportEmail) {
      window.location.href = `mailto:${contactSupportEmail}`;
    } else if (contactSupportUrl) {
      window.open(contactSupportUrl, '_blank');
    }
  };

  return (
    <>
      {showContactSupport && (onContactSupport || contactSupportUrl || contactSupportEmail) && (
        <button
          onClick={handleContactSupport}
          className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors px-6 py-2"
        >
          Talk to a human instead →
        </button>
      )}
      <div className="text-[12px] text-center text-gray-400 pt-2 border-t border-gray-100 mt-2 pb-3">
        <a
          href="https://getdynamiq.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-600 transition-colors"
        >
          Powered by Dynamiq
        </a>
      </div>
    </>
  );
};
