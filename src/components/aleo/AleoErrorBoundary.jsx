import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary specifically for Aleo page
 * Catches WASM initialization errors and provides recovery options
 */
class AleoErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[AleoErrorBoundary] Caught error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center w-full min-h-screen gap-8 p-4 md:p-8 bg-[#fafafa]">
                    <Card className="max-w-md bg-white/80 backdrop-blur-xl border border-red-100 shadow-2xl rounded-3xl">
                        <CardBody className="p-8 text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-gray-900 mb-2">
                                    Aleo Initialization Error
                                </h2>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    The Aleo SDK failed to initialize. This might be due to WebAssembly compatibility issues in your browser.
                                </p>
                            </div>

                            <div className="p-4 bg-red-50 rounded-2xl text-left">
                                <p className="text-xs font-mono text-red-800 break-all">
                                    {this.state.error?.message || 'Unknown error'}
                                </p>
                            </div>

                            <div className="flex gap-3 w-full">
                                <Button
                                    onClick={this.handleRetry}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold h-12 rounded-2xl"
                                    startContent={<RefreshCw size={18} />}
                                >
                                    Retry
                                </Button>
                                <Button
                                    onClick={this.handleReset}
                                    className="flex-1 bg-gray-100 text-gray-700 font-bold h-12 rounded-2xl hover:bg-gray-200"
                                >
                                    Go Home
                                </Button>
                            </div>

                            <details className="text-left">
                                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                    Technical Details
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-100 rounded-xl text-[10px] overflow-auto max-h-40">
                                    {this.state.error?.stack || String(this.state.error)}
                                </pre>
                            </details>
                        </CardBody>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default AleoErrorBoundary;
