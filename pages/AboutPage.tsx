
import React from 'react';
import Card from '../components/ui/Card';
import { TLX_DIMENSIONS_INFO } from '../constants';

const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white">About CaTLX & NASA-TLX</h1>
      <Card>
        <h2 className="text-2xl font-semibold text-white mb-4">What is the NASA Task Load Index (TLX)?</h2>
        <div className="space-y-4 text-nasa-gray-300">
          <p>
            The NASA Task Load Index (NASA-TLX) is a widely used subjective assessment tool developed by the NASA Ames Research Center. Its primary purpose is to measure the perceived workload of an operator while they perform a task. By quantifying workload, researchers and designers can better understand the demands a task places on a user, identify potential sources of stress, and optimize system design for better performance and safety.
          </p>
          <p>
            The assessment is based on a multi-dimensional approach, breaking down workload into six distinct subscales:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            {TLX_DIMENSIONS_INFO.map(dim => (
                <li key={dim.id}>
                    <span className="font-semibold text-white">{dim.title}:</span> {dim.description}
                </li>
            ))}
          </ul>
          <p>
            The NASA-TLX method involves two parts:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
              <li>
                  <span className="font-semibold">Ratings:</span> An operator provides a rating (from 0 to 100) for each of the six dimensions based on their experience performing a specific task.
              </li>
              <li>
                  <span className="font-semibold">Weights:</span> Through a series of pairwise comparisons, the operator chooses which dimension was a more significant source of workload. This process creates a set of weights that reflect the individual's unique perception of workload for that task.
              </li>
          </ol>
          <p>
            The final workload score is calculated by multiplying each dimension's rating by its corresponding weight and then summing the results. This provides a comprehensive and individually tailored workload score.
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
    </div>
  );
};

export default AboutPage;
