import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Keep one malfunctioning room from blanking the whole app; details go to the browser console. */
export class CubeErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, details: ErrorInfo) {
    console.error('Cube Flight mount failed:', error, details.componentStack);
  }
  render() {
    if (this.state.failed)
      return <div role="alert" dir="rtl">حصل عطل في تحميل اللعبة. ارجعي وجربي مرة تانية.</div>;
    return this.props.children;
  }
}
