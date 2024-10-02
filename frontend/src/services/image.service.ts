import {
  getDownloadURL,
  listAll,
  ref
} from "firebase/storage";
import { makeObservable } from "mobx";

import {Service} from './service';
import {FirebaseService} from './firebase.service';

interface ServiceProvider {
  firebaseService: FirebaseService;
}

// Temporary list of refs for image loading
const LIST_REF_PATHS = ['images/las'];

/** Manages images loaded from Firebase storage. */
export class ImageService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
    this.loadImages();
  }

  // Maps from image ID to image src
  imageMap: Record<string, string> = {};

  /** Load all images from storage. */
  loadImages() {
    for (const path of LIST_REF_PATHS) {
      const listRef = ref(this.sp.firebaseService.storage, path);

      listAll(listRef).then((res) => {
        // For all items under list ref, try loading image
        res.items.forEach((itemId) => {
          this.setImage(itemId.fullPath);
        });
      }).catch((error) => {
        // Uh-oh, an error occurred!
      });
    }
  }

  setImage(imageId: string) {
    const imageRef = ref(this.sp.firebaseService.storage, `images/${imageId}`);
    getDownloadURL(imageRef).then((url) => {
      this.imageMap[imageId] = url;
    })
    .catch((error) => {
      // Handle any errors
    });
  }

  /** Returns image src (or empty string if not found) */
  getImageSrc(imageId: string) {
    return this.imageMap[imageId] ?? '';
  }
}
