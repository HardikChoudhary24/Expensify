import _ from 'underscore';
import React, {Component} from 'react';
import {View, Dimensions} from 'react-native';
import {Document, Page, pdfjs} from 'react-pdf/dist/esm/entry.webpack';
import pdfWorkerSource from 'pdfjs-dist/legacy/build/pdf.worker';
import {VariableSizeList as List} from 'react-window';
import FullScreenLoadingIndicator from '../FullscreenLoadingIndicator';
import styles from '../../styles/styles';
import variables from '../../styles/variables';
import CONST from '../../CONST';
import PDFPasswordForm from './PDFPasswordForm';
import * as pdfViewPropTypes from './pdfViewPropTypes';
import withWindowDimensions from '../withWindowDimensions';
import withLocalize from '../withLocalize';
import Text from '../Text';
import compose from '../../libs/compose';

class PDFView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            numPages: null,
            pageViewports: [],
            windowWidth: Dimensions.get('window').width,
            shouldRequestPassword: false,
            isPasswordInvalid: false,
            isKeyboardOpen: false,
        };
        this.onDocumentLoadSuccess = this.onDocumentLoadSuccess.bind(this);
        this.initiatePasswordChallenge = this.initiatePasswordChallenge.bind(this);
        this.attemptPDFLoad = this.attemptPDFLoad.bind(this);
        this.toggleKeyboardOnSmallScreens = this.toggleKeyboardOnSmallScreens.bind(this);
        this.calculatePageHeight = this.calculatePageHeight.bind(this);
        this.calculatePageWidth = this.calculatePageWidth.bind(this);
        this.renderPage = this.renderPage.bind(this);

        const workerBlob = new Blob([pdfWorkerSource], {type: 'text/javascript'});
        pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
    }

    componentDidUpdate(prevProps) {
        // Use window height changes to toggle the keyboard. To maintain keyboard state
        // on all platforms we also use focus/blur events. So we need to make sure here
        // that we avoid redundant keyboard toggling.
        if (!this.state.isKeyboardOpen && this.props.windowHeight < prevProps.windowHeight) {
            this.toggleKeyboardOnSmallScreens(true);
        } else if (this.state.isKeyboardOpen && this.props.windowHeight > prevProps.windowHeight) {
            this.toggleKeyboardOnSmallScreens(false);
        }
    }

    /**
     * Upon successful document load, combine an array of page viewports,
     * set the number of pages on PDF,
     * hide/reset PDF password form, and notify parent component that
     * user input is no longer required.
     *
     * @param {*} pdf The PDF file instance
     * @memberof PDFView
     */
    onDocumentLoadSuccess(pdf) {
        const numPages = pdf.numPages;

        Promise.all(
            _.times(numPages, (index) => {
                const pageNumber = index + 1;

                return pdf.getPage(pageNumber).then((page) => page.getViewport({scale: 1}));
            }),
        ).then((pageViewports) => {
            this.setState({
                pageViewports,
                numPages,
                shouldRequestPassword: false,
                isPasswordInvalid: false,
            });
        });
    }

    calculatePageHeight(pageIndex) {
        if (this.state.pageViewports.length === 0) {
            throw new Error('calculatePageHeight() called too early');
        }

        const pageViewport = this.state.pageViewports[pageIndex];
        const scale = this.calculatePageWidth() / pageViewport.width;
        const actualHeight = pageViewport.height * scale;

        return actualHeight;
    }

    calculatePageWidth() {
        const pdfContainerWidth = this.state.windowWidth - 100;
        const pageWidthOnLargeScreen = pdfContainerWidth <= variables.pdfPageMaxWidth ? pdfContainerWidth : variables.pdfPageMaxWidth;
        const pageWidth = this.props.isSmallScreenWidth ? this.state.windowWidth : pageWidthOnLargeScreen;

        return pageWidth;
    }

    /**
     * Initiate password challenge process. The react-pdf/Document
     * component calls this handler to indicate that a PDF requires a
     * password, or to indicate that a previously provided password was
     * invalid.
     *
     * The PasswordResponses constants used below were copied from react-pdf
     * because they're not exported in entry.webpack.
     *
     * @param {Function} callback Callback used to send password to react-pdf
     * @param {Number} reason Reason code for password request
     */
    initiatePasswordChallenge(callback, reason) {
        this.onPasswordCallback = callback;

        if (reason === CONST.PDF_PASSWORD_FORM.REACT_PDF_PASSWORD_RESPONSES.NEED_PASSWORD) {
            this.setState({shouldRequestPassword: true});
        } else if (reason === CONST.PDF_PASSWORD_FORM.REACT_PDF_PASSWORD_RESPONSES.INCORRECT_PASSWORD) {
            this.setState({shouldRequestPassword: true, isPasswordInvalid: true});
        }
    }

    /**
     * Send password to react-pdf via its callback so that it can attempt to load
     * the PDF.
     *
     * @param {String} password Password to send via callback to react-pdf
     */
    attemptPDFLoad(password) {
        this.onPasswordCallback(password);
    }

    /**
     * On small screens notify parent that the keyboard has opened or closed.
     *
     * @param {Boolean} isKeyboardOpen True if keyboard is open
     */
    toggleKeyboardOnSmallScreens(isKeyboardOpen) {
        if (!this.props.isSmallScreenWidth) {
            return;
        }
        this.setState({isKeyboardOpen});
        this.props.onToggleKeyboard(isKeyboardOpen);
    }

    renderPage({index, style}) {
        const pageWidth = this.calculatePageWidth();

        return (
            <View style={style}>
                <Page
                    key={`page_${index}`}
                    width={pageWidth}
                    pageIndex={index}
                    // This needs to be empty to avoid multiple loading texts which show per page and look ugly
                    // See https://github.com/Expensify/App/issues/14358 for more details
                    loading=""
                />
            </View>
        );
    }

    render() {
        const pageWidth = this.calculatePageWidth();
        const outerContainerStyle = [styles.w100, styles.h100, styles.justifyContentCenter, styles.alignItemsCenter];

        // If we're requesting a password then we need to hide - but still render -
        // the PDF component.
        const pdfContainerStyle = this.state.shouldRequestPassword
            ? [styles.PDFView, styles.noSelect, this.props.style, styles.invisible]
            : [styles.PDFView, styles.noSelect, this.props.style];

        return (
            <View style={outerContainerStyle}>
                <View
                    focusable
                    style={pdfContainerStyle}
                    onLayout={(event) => this.setState({windowWidth: event.nativeEvent.layout.width})}
                >
                    <Document
                        error={<Text style={[styles.textLabel, styles.textLarge]}>{this.props.translate('attachmentView.failedToLoadPDF')}</Text>}
                        loading={<FullScreenLoadingIndicator />}
                        file={this.props.sourceURL}
                        options={{
                            cMapUrl: 'cmaps/',
                            cMapPacked: true,
                        }}
                        externalLinkTarget="_blank"
                        onLoadSuccess={this.onDocumentLoadSuccess}
                        onPassword={this.initiatePasswordChallenge}
                    >
                        {this.state.pageViewports.length > 0 && (
                            <List
                                width={pageWidth}
                                height={this.props.windowHeight}
                                estimatedItemSize={this.calculatePageHeight(0)}
                                itemCount={this.state.numPages}
                                itemSize={this.calculatePageHeight}
                            >
                                {this.renderPage}
                            </List>
                        )}
                    </Document>
                </View>
                {this.state.shouldRequestPassword && (
                    <PDFPasswordForm
                        onSubmit={this.attemptPDFLoad}
                        onPasswordUpdated={() => this.setState({isPasswordInvalid: false})}
                        isPasswordInvalid={this.state.isPasswordInvalid}
                        onPasswordFieldFocused={this.toggleKeyboardOnSmallScreens}
                    />
                )}
            </View>
        );
    }
}

PDFView.propTypes = pdfViewPropTypes.propTypes;
PDFView.defaultProps = pdfViewPropTypes.defaultProps;

export default compose(withLocalize, withWindowDimensions)(PDFView);
