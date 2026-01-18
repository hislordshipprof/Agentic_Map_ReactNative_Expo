/**
 * Dialogs Components Index - Agentic Mobile Map
 *
 * Central export for all dialog components used in
 * confidence-based UI flows per requirements-frontend.md Phase 2.
 */

// Confirmation Dialog (MEDIUM confidence 0.60-0.79)
export {
  ConfirmationDialog,
  type ConfirmationDialogProps,
  type ConfirmationEntities,
} from './ConfirmationDialog';

// Disambiguation Dialog (multiple place options)
export {
  DisambiguationDialog,
  type DisambiguationDialogProps,
  type PlaceCandidate,
} from './DisambiguationDialog';

// Alternatives Dialog (LOW confidence < 0.60)
export {
  AlternativesDialog,
  type AlternativesDialogProps,
  type Alternative,
  DEFAULT_ALTERNATIVES,
} from './AlternativesDialog';

// Error Dialog (various error states)
export {
  ErrorDialog,
  ErrorDialogs,
  type ErrorDialogProps,
  type ErrorAction,
  type ErrorType,
} from './ErrorDialog';
