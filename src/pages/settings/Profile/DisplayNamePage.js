import lodashGet from 'lodash/get';
import React from 'react';
import {View} from 'react-native';
import withCurrentUserPersonalDetails, {withCurrentUserPersonalDetailsDefaultProps, withCurrentUserPersonalDetailsPropTypes} from '../../../components/withCurrentUserPersonalDetails';
import ScreenWrapper from '../../../components/ScreenWrapper';
import HeaderWithBackButton from '../../../components/HeaderWithBackButton';
import withLocalize, {withLocalizePropTypes} from '../../../components/withLocalize';
import ONYXKEYS from '../../../ONYXKEYS';
import CONST from '../../../CONST';
import * as ValidationUtils from '../../../libs/ValidationUtils';
import TextInput from '../../../components/TextInput';
import Text from '../../../components/Text';
import styles from '../../../styles/styles';
import * as PersonalDetails from '../../../libs/actions/PersonalDetails';
import DummyComponentWithStateHook from '../../../components/DummyComponentWithStateHook';
import compose from '../../../libs/compose';
import * as ErrorUtils from '../../../libs/ErrorUtils';
import ROUTES from '../../../ROUTES';
import Navigation from '../../../libs/Navigation/Navigation';
import useForm from '../../../hooks/form/useForm';

const propTypes = {
    ...withLocalizePropTypes,
    ...withCurrentUserPersonalDetailsPropTypes,
};

const defaultProps = {
    ...withCurrentUserPersonalDetailsDefaultProps,
};

/**
 * Submit form to update user's first and last name (and display name)
 * @param {Object} values
 * @param {String} values.firstName
 * @param {String} values.lastName
 */
const updateDisplayName = (values) => {
    PersonalDetails.updateDisplayName(values.firstName.trim(), values.lastName.trim());
};

function DisplayNamePage(props) {
    const currentUserDetails = props.currentUserPersonalDetails || {};

    /**
     * @param {Object} values
     * @param {String} values.firstName
     * @param {String} values.lastName
     * @returns {Object} - An object containing the errors for each inputID
     */
    const validate = (values) => {
        const requiredFields = ['firstName'];
        const errors = ValidationUtils.getFieldRequiredErrors(values, requiredFields);

        // First we validate the first name field
        if (!ValidationUtils.isValidDisplayName(values.firstName)) {
            ErrorUtils.addErrorMessage(errors, 'firstName', 'personalDetails.error.hasInvalidCharacter');
        }
        if (ValidationUtils.doesContainReservedWord(values.firstName, CONST.DISPLAY_NAME.RESERVED_FIRST_NAMES)) {
            ErrorUtils.addErrorMessage(errors, 'firstName', 'personalDetails.error.containsReservedWord');
        }

        // Then we validate the last name field
        if (!ValidationUtils.isValidDisplayName(values.lastName)) {
            errors.lastName = 'personalDetails.error.hasInvalidCharacter';
        }
        return errors;
    };

    // register input requires props spreading
    /* eslint-disable react/jsx-props-no-spreading */
    const {Form, registerInput} = useForm({validate});

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
        >
            <HeaderWithBackButton
                title={props.translate('displayNamePage.headerTitle')}
                onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS_PROFILE)}
            />
            <Form
                style={[styles.flexGrow1, styles.ph5]}
                formID={ONYXKEYS.FORMS.DISPLAY_NAME_FORM}
                validate={validate}
                onSubmit={updateDisplayName}
                submitButtonText={props.translate('common.save')}
                enabledWhenOffline
            >
                <DummyComponentWithStateHook />
                <Text style={[styles.mb6]}>{props.translate('displayNamePage.isShownOnProfile')}</Text>
                <View style={styles.mb4}>
                    <TextInput
                        {...registerInput('firstName', {
                            name: 'fname',
                            label: props.translate('common.firstName'),
                            accessibilityLabel: props.translate('common.firstName'),
                            accessibilityRole: CONST.ACCESSIBILITY_ROLE.TEXT,
                            defaultValue: lodashGet(currentUserDetails, 'firstName', ''),
                            maxLength: CONST.DISPLAY_NAME.MAX_LENGTH,
                            autoCapitalize: 'words',
                            spellCheck: false,
                        })}
                    />
                </View>
                <View>
                    <TextInput
                        {...registerInput('lastName', {
                            name: 'lname',
                            label: props.translate('common.lastName'),
                            accessibilityLabel: props.translate('common.lastName'),
                            accessibilityRole: CONST.ACCESSIBILITY_ROLE.TEXT,
                            defaultValue: lodashGet(currentUserDetails, 'lastName', ''),
                            maxLength: CONST.DISPLAY_NAME.MAX_LENGTH,
                            autoCapitalize: 'words',
                            spellCheck: false,
                        })}
                    />
                </View>
            </Form>
        </ScreenWrapper>
    );
}

DisplayNamePage.propTypes = propTypes;
DisplayNamePage.defaultProps = defaultProps;
DisplayNamePage.displayName = 'DisplayNamePage';

export default compose(withLocalize, withCurrentUserPersonalDetails)(DisplayNamePage);
