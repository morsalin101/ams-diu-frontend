import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Yes, Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {
      // Error handling is handled by caller (toast, etc.)
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={isLoading ? () => {} : onOpenChange}>
      <AlertDialogContent className="sm:max-w-[420px] p-6 text-center rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900">
        <AlertDialogHeader className="flex flex-col items-center gap-3 text-center sm:text-center">
          {/* SweetAlert-style circular icon badge */}
          {variant === 'danger' && (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 ring-8 ring-red-50 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-900/20 transition-all transform scale-100">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          )}
          {variant === 'warning' && (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-8 ring-amber-50 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-900/20 transition-all transform scale-100">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          )}
          {variant === 'info' && (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 ring-8 ring-blue-50 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-900/20 transition-all transform scale-100">
              <Info className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          )}

          <AlertDialogTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mt-1">
            {title}
          </AlertDialogTitle>

          {description && (
            <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed px-2 text-center">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-row items-center justify-center gap-3 sm:justify-center mt-6 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={handleCancel}
            className="flex-1 py-2.5 font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg border-gray-300 dark:border-gray-700 transition-colors"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={cn(
              "flex-1 py-2.5 font-medium text-white rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2",
              variant === 'danger'
                ? "bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500"
                : variant === 'warning'
                ? "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 focus:ring-amber-500"
                : "bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:opacity-90 focus:ring-indigo-500"
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
export default ConfirmDialog;
