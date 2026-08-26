export abstract class ServiceWorkerContract {
  static readonly CachePrefix = 'lucerna-static-';
  static readonly InstalledState = 'installed';
  static readonly RedundantState = 'redundant';
  static readonly ActivateWaitingMessage = 'SW_ACTIVATE_WAITING';
  static readonly GetMethod = 'GET';
  static readonly NavigateMode = 'navigate';
  static readonly UpdateCheckMilliseconds = 1_200_000;
}
