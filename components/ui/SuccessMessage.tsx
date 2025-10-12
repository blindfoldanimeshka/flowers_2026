import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessMessageProps {
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  title,
  message,
  onClose,
  className = '',
}) => {
  return (
    <div className={`rounded-md border border-green-200 bg-green-50 p-4 text-green-800 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <CheckCircle className="h-5 w-5 text-green-400" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex rounded-md p-1.5 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-green-50"
              >
                <span className="sr-only">Закрыть</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessMessage;

