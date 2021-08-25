import React, { useState } from 'react';
import VisibilitySensor from 'react-visibility-sensor';
import { Placeholder, Dimmer, Loader } from 'semantic-ui-react';
import cookie from 'react-cookie';
//import { find, without } from 'lodash';
import { serializeNodes } from 'volto-slate/editor/render';
import { Button, Checkbox } from 'semantic-ui-react';
import { defineMessages, injectIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import config from '@plone/volto/registry';
import '../css/embed-styles.css';
import { createImageUrl } from './helpers';

import {
  getBaseUrl,
  // getBlocksFieldname,
  // getBlocksLayoutFieldname,
} from '@plone/volto/helpers';
import { Toast } from '@plone/volto/components';

const messages = defineMessages({
  success: {
    id: 'Success',
    defaultMessage: 'Success',
  },
  image: {
    id: 'Live image generated',
    defaultMessage: 'Live image generated',
  },
});

const key = (domain_key) => `accept-${domain_key}`;

const getExpDays = () =>
  typeof config.settings.embedCookieExpirationDays !== 'undefined'
    ? config.settings.embedCookieExpirationDays
    : 90;

function saveCookie(domain_key) {
  const date = new Date();
  date.setDate(date.getDate() + getExpDays());

  cookie.save(key(domain_key), 'true', {
    path: '/',
    expires: date,
  });
}

function canShow(domain_key) {
  return cookie.load(key(domain_key)) === 'true';
}

export default injectIntl(
  ({
    children,
    data = {},
    id,
    isEditMode,
    onChangeBlock,
    intl,
    path,
    properties,
    ...rest
  }) => {
    const { dataprotection = {} } = data;
    const { background_image: bgImg, enabled = false } = dataprotection;
    const [image, setImage] = React.useState(null);
    const dispatch = useDispatch();

    // const blocksFieldname = getBlocksFieldname(properties);
    // const blocksLayoutFieldname = getBlocksLayoutFieldname(properties);

    // const getPrivacyEnabledBlock = (key) => {
    //   const en = find(without(key, id), (block) => {
    //     if (properties[blocksFieldname]?.[block][blocksLayoutFieldname].items) {
    //       getPrivacyEnabledBlock(
    //         properties[blocksFieldname]?.[block][blocksLayoutFieldname].items,
    //       );
    //     }
    //     return (
    //       properties[blocksFieldname]?.[block]?.['@type'] ===
    //       'data_connected_embed'
    //     );
    //   });
    //   if (en) {
    //     return (
    //       properties[blocksFieldname]?.[en].dataprotection.enabled &&
    //       properties[blocksFieldname]?.[en].dataprotection
    //         .privacy_cookie_key === key
    //     );
    //   }
    // };

    React.useEffect(() => {
      if (bgImg) {
        setImage(createImageUrl(bgImg)); //create imageUrl from uploaded image
      }
    }, [bgImg]);

    const [visible, setVisibility] = useState(false);
    const defaultShow = canShow(dataprotection.privacy_cookie_key);
    // const isIdentical = getPrivacyEnabledBlock(
    //   properties[blocksLayoutFieldname].items,
    // );
    const [show, setShow] = useState(defaultShow);
    const [remember, setRemember] = useState(defaultShow);

    React.useEffect(() => {
      if (isEditMode && defaultShow && !enabled) {
        onChangeBlock(id, {
          ...data,
          dataprotection: {
            ...dataprotection,
            enabled: true,
          },
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
      if (enabled && !bgImg && !show) {
        fetch(
          `${getBaseUrl(
            path || '',
          )}/cors-proxy/https://screenshot.eea.europa.eu/api/v1/retrieve_image_for_url?url=${
            data.url
          }&w=1920&waitfor=4000`,
        )
          .then((e) => e.blob())
          .then((blob) => {
            setImage(URL.createObjectURL(blob));
            if (isEditMode) {
              toast.success(
                <Toast
                  success
                  title={intl.formatMessage(messages.success)}
                  content={intl.formatMessage(messages.image)}
                />,
              );
            }
          });
      }
    }, [enabled, data.url, path, dispatch, bgImg, show, intl, isEditMode]);

    return (
      <VisibilitySensor
        onChange={(isVisible) => {
          !visible && isVisible && setVisibility(true);
        }}
        partialVisibility={true}
        offset={{ bottom: 200 }}
      >
        {visible ? (
          <div>
            {!dataprotection.enabled || show ? (
              children
            ) : !image ? (
              <Dimmer active>
                <Loader />
              </Dimmer>
            ) : (
              <div
                className="privacy-protection"
                {...rest}
                style={
                  image
                    ? {
                        backgroundImage: `url(${image})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                      }
                    : {}
                }
              >
                <div className="overlay">
                  <div className="wrapped">
                    <div className="privacy-statement">
                      {serializeNodes(dataprotection.privacy_statement || [])}
                    </div>
                    <div className="privacy-button">
                      <Button
                        primary
                        onClick={() => {
                          setShow(true);
                          if (remember) {
                            saveCookie(dataprotection.privacy_cookie_key);
                          }
                        }}
                      >
                        Show external content
                      </Button>
                    </div>

                    {!isEditMode && (
                      <div className="privacy-toggle">
                        <Checkbox
                          toggle
                          label="Remember my choice"
                          id={`remember-choice-${id}`}
                          onChange={(ev, { checked }) => {
                            setRemember(checked);
                          }}
                          checked={remember}
                        />
                      </div>
                    )}

                    <p className="discreet">
                      Your choice will be saved in a cookie managed by{' '}
                      {config.settings.ownDomain || '.eea.europa.eu'} that will
                      expire in {getExpDays()} days.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Placeholder style={{ height: '100%', width: '100%' }}>
            <Placeholder.Image rectangular />
          </Placeholder>
        )}
      </VisibilitySensor>
    );
  },
);
