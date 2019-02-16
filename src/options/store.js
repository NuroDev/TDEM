import Vue from 'vue';
import Vuex from 'vuex';

import { storage } from '../js/util';
import template from '../js/template';

Vue.use(Vuex);

const state = {
  extensions: [],
  settings: {}
}

const mutations = {
  getExtensionStorage (state) {
    storage.get((storage) => {
        state.extensions = storage.extensions,
        state.settings = storage.settings
    });
  },
  toggleSidebar (state) {
      state.settings.isSidebarMini = !state.settings.isSidebarMini
  }
}

const actions = {
    getExtensionStorage: ({ commit }) => commit('getExtensionStorage'),
    toggleSidebar: ({ commit }) => commit('toggleSidebar'),
}

export default new Vuex.Store({
  state,
  actions,
  mutations
})