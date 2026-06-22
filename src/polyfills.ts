if (typeof window !== 'undefined') {
  window.process = window.process || ({} as any);
  (window.process as any).getBuiltinModule = (window.process as any).getBuiltinModule || (() => undefined);
}
