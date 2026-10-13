import { Component, type ReactNode } from 'react';

/** Keeps one failing panel (usually a room's custom component) from taking the room down. */
export class PanelBoundary extends Component<
  { children: ReactNode; message: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="room-error" role="alert">
        {this.props.message}{' '}
        <button type="button" onClick={() => this.setState({ failed: false })}>
          ↻
        </button>
      </p>
    );
  }
}
