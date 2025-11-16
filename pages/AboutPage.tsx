
import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import { TLX_DIMENSIONS_INFO } from '../constants';

const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white">{t('about.title')}</h1>
      
      <Card>
        <h2 className="text-2xl font-semibold text-white mb-4">{t('about.nasa_tlx_title')}</h2>
        <div className="space-y-4 text-nasa-gray-300">
          <p>
            {t('about.nasa_tlx_desc1')}
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 pl-4">
            {TLX_DIMENSIONS_INFO.map(dim => (
                <li key={dim.id} className="font-semibold text-white list-disc list-inside">{dim.title}</li>
            ))}
          </ul>
          <p>
            {t('about.nasa_tlx_desc2')}
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold text-white mb-4">{t('about.catlx_title')}</h2>
         <div className="space-y-4 text-nasa-gray-300">
            <p>
                {t('about.catlx_desc1')}
            </p>
            <p>
                {t('about.catlx_desc2')}
            </p>
         </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold text-white mb-4">{t('about.offline_title')}</h2>
        <div className="space-y-4 text-nasa-gray-300">
            <p>
                {t('about.offline_desc1')}
            </p>
            <h3 className="text-lg font-semibold text-white">{t('about.how_to_install')}</h3>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li>
                    <span className="font-semibold">{t('about.install_chrome')}</span>
                </li>
                <li>
                    <span className="font-semibold">{t('about.install_safari')}</span>
                </li>
                <li>
                    <span className="font-semibold">{t('about.install_android')}</span>
                </li>
            </ul>
            <p>
                {t('about.install_desc')}
            </p>
        </div>
      </Card>
    </div>
  );
};

export default AboutPage;
