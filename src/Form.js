import axios from 'axios'
import Errors from './Errors'
import { deepCopy } from './util'

class Form {
  /**
   * Create a new form instance.
   *
   * @param {Object} data
   */
  constructor (data = {}) {
    Object.defineProperties(this, {
      busy: {
        writable: true,
        value: false
      },
      successful: {
        writable: true,
        value: false
      },
      errors: {
        writable: true,
        value: new Errors()
      },
      originalData: {
        writable: true,
        value: deepCopy(data)
      }
    })

    Object.assign(this, data)
  }

  /**
   * Fill form data.
   *
   * @param {Object} data
   */
  fill (data) {
    this.keys().forEach(key => {
      this[key] = data[key]
    })
  }

  /**
   * Get the form data.
   *
   * @return {Object}
   */
  data () {
    return this.keys().reduce((data, key) => (
      { ...data, [key]: this[key] }
    ), {})
  }

  /**
   * Get the form data keys.
   *
   * @return {Array}
   */
  keys () {
    return Object.keys(this)
  }

  /**
   * Start processing the form.
   */
  startProcessing () {
    this.errors.clear()
    this.busy = true
    this.successful = false
  }

  /**
   * Finish processing the form.
   */
  finishProcessing () {
    this.busy = false
    this.successful = true
  }

  /**
   * Clear the form errors.
   */
  clear () {
    this.errors.clear()
    this.successful = false
  }

  /**
   * Reset the form fields.
   */
  reset () {
    Object.keys(this)
      .forEach(key => {
        this[key] = deepCopy(this.originalData[key])
      })
  }

  /**
   * Submit the from via a GET request.
   *
   * @param  {String} url
   * @return {Promise}
   */
  get (url) {
    return this.submit('get', url)
  }

  /**
   * Submit the from via a POST request.
   *
   * @param  {String} url
   * @return {Promise}
   */
  post (url) {
    return this.submit('post', url)
  }

  /**
   * Submit the from via a PATCH request.
   *
   * @param  {String} url
   * @return {Promise}
   */
  patch (url) {
    return this.submit('patch', url)
  }

  /**
   * Submit the from via a PUT request.
   *
   * @param  {String} url
   * @return {Promise}
   */
  put (url) {
    return this.submit('put', url)
  }

  /**
   * Submit the from via a DELETE request.
   *
   * @param  {String} url
   * @return {Promise}
   */
  delete (url) {
    return this.submit('delete', url)
  }

  /**
   * Submit the form data via an HTTP request.
   *
   * @param  {String} method (get, post, patch, put)
   * @param  {String} url
   * @param  {Object} config (axios config)
   * @return {Promise}
   */
  submit (method, url, config = {}) {
    this.startProcessing()

    const data = method === 'get'
      ? { params: this.data() }
      : this.data()

    return new Promise((resolve, reject) => {
      axios.request({ url: this.route(url), method, data, ...config })
        .then(response => {
          this.finishProcessing()

          resolve(response)
        })
        .catch(error => {
          this.busy = false

          if (error.response) {
            this.errors.set(this.extractErrors(error.response))
          }

          reject(error)
        })
    })
  }

  /**
   * Extract the errors from the response object.
   *
   * @param  {Object} response
   * @return {Object}
   */
  extractErrors (response) {
    const data = response.data

    if (!data || typeof data !== 'object') {
      return { error: Form.errorMessage }
    }

    if (data.errors) {
      return { ...data.errors }
    }

    if (data.message) {
      return { error: data.message }
    }

    if (data.error && data.error.message) {
      if (typeof data.error.message === 'object') {
        return { ...data.error.message }
      } else {
        return { error: data.error.message }
      }
    }

    return { ...data }
  }

  /**
   * Get a named route.
   *
   * @param  {String} name
   * @return {Object} parameters
   * @return {String}
   */
  route (name, parameters = {}) {
    let url = name

    if (Form.routes.hasOwnProperty(name)) {
      url = decodeURI(Form.routes[name])
    }

    if (typeof parameters !== 'object') {
      parameters = { id: parameters }
    }

    Object.keys(parameters).forEach(key => {
      url = url.replace(`{${key}}`, parameters[key])
    })

    return url
  }

  /**
   * Clear errors on keydown.
   *
   * @param {KeyboardEvent} event
   */
  onKeydown (event) {
    if (event.target.name) {
      this.errors.clear(event.target.name)
    }
  }
}

Form.routes = {}
Form.errorMessage = 'Something went wrong. Please try again.'

export default Form
