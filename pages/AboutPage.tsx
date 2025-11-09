
import React from 'react';
import Card from '../components/ui/Card';
import { TLX_DIMENSIONS_INFO } from '../constants';

const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white">About CaTLX & NASA-TLX</h1>
      
      <Card>
        <h2 className="text-2xl font-semibold text-white mb-4">The NASA Task Load Index (TLX)</h2>
        <div className="space-y-4 text-nasa-gray-300">
          <p>
            The NASA Task Load Index (TLX) is a widely-used tool for measuring the perceived workload of a task. It helps quantify the demands placed on a person by breaking down workload into six key dimensions:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 pl-4">
            {TLX_DIMENSIONS_INFO.map(dim => (
                <li key={dim.id} className="font-semibold text-white list-disc list-inside">{dim.title}</li>
            ))}
          </ul>
          <p>
            An assessment involves two steps: first, a series of pairwise comparisons determines the relative importance (weight) of each dimension to the individual (this is done once per study). Second, each dimension is rated on a scale from 0 to 100 for each task. The final score is a weighted average of the ratings, providing a comprehensive and personally-tailored workload measurement.
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold text-white mb-4">About This Application (CaTLX)</h2>
         <div className="space-y-4 text-nasa-gray-300">
            <p>
                CaTLX is a modern, web-based implementation of the NASA-TLX assessment protocol. It provides a streamlined interface for both administrators to set up studies and for evaluators to submit their workload ratings.
            </p>
            <p>
                Developed by Mlr.
            </p>
         </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold text-white mb-4">Offline Use & Installation (PWA)</h2>
        <div className="space-y-4 text-nasa-gray-300">
            <p>
                CaTLX is a Progressive Web App (PWA), which means you can install it on your device for a more app-like experience and use it even when you're offline (in "Local Mode").
            </p>
            <h3 className="text-lg font-semibold text-white">How to Install:</h3>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li>
                    <span className="font-semibold">Chrome (Desktop):</span> Look for the "Install" icon (a computer with a down arrow) in the address bar and click it.
                </li>
                <li>
                    <span className="font-semibold">Safari (iOS/iPadOS):</span> Tap the "Share" button, then scroll down and select "Add to Home Screen".
                </li>
                <li>
                    <span className="font-semibold">Android (Chrome/Firefox):</span> Tap the browser's menu button (three dots) and select "Install app" or "Add to Home screen".
                </li>
            </ul>
            <p>
                Once installed, you can launch CaTLX directly from your home screen or app drawer, just like a native application.
            </p>
        </div>
      </Card>
    </div>
  );
};

export default AboutPage;