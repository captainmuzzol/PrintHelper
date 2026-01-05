import os
import sys
import json
import logging
from docx import Document
from docxcompose.composer import Composer

# Try importing win32com, if it fails (e.g. on macOS/Linux), we just won't support .doc conversion
try:
    import win32com.client as win32
    HAS_WIN32 = True
except ImportError:
    win32 = None
    HAS_WIN32 = False

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def convert_doc_to_docx(doc_path):
    """
    Convert .doc to .docx using win32com (requires MS Word installed)
    """
    if not HAS_WIN32:
        logger.error("Cannot convert .doc to .docx: win32com not available (Windows only)")
        return None

    try:
        word = win32.gencache.EnsureDispatch('Word.Application')
        doc = word.Documents.Open(doc_path)
        doc.Activate()

        # Rename .doc to .docx
        new_file_path = os.path.splitext(doc_path)[0] + ".docx"
        
        # FileFormat=12 for .docx, 16 for .docx (default)
        # wdFormatXMLDocument = 12
        word.ActiveDocument.SaveAs(new_file_path, FileFormat=12)
        doc.Close(False)
        return new_file_path
    except Exception as e:
        logger.error(f"Failed to convert {doc_path} to .docx: {str(e)}")
        return None

def merge_word_files(file_list, output_path):
    if not file_list:
        logger.error("No files to merge")
        return False

    processed_files = []
    
    # Pre-process files (convert .doc to .docx)
    for file_path in file_list:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.doc':
            logger.info(f"Converting {file_path} to .docx...")
            docx_path = convert_doc_to_docx(file_path)
            if docx_path:
                processed_files.append(docx_path)
            else:
                logger.warning(f"Skipping {file_path} due to conversion failure")
        elif ext == '.docx':
            processed_files.append(file_path)
        else:
            logger.warning(f"Skipping unsupported file format: {file_path}")

    if not processed_files:
        logger.error("No valid .docx files to merge")
        return False

    try:
        logger.info(f"Merging {len(processed_files)} files...")
        
        # Start with the first file
        first_file = processed_files[0]
        main_doc = Document(first_file)
        main_doc.add_page_break()
        composer = Composer(main_doc)

        # Append the rest
        for i, file_path in enumerate(processed_files[1:]):
            logger.info(f"Appending {file_path}...")
            doc = Document(file_path)
            
            # Add page break before appending, except for the last one if desired
            # The requirement implies merging them. Usually we want a page break between docs.
            if i < len(processed_files) - 2: 
                 doc.add_page_break()
            
            composer.append(doc)

        logger.info(f"Saving merged document to {output_path}")
        composer.save(output_path)
        return True

    except Exception as e:
        logger.error(f"Error during merge: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python word_merge.py <json_file_list_path> <output_path>")
        sys.exit(1)

    json_list_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        with open(json_list_path, 'r', encoding='utf-8') as f:
            file_list = json.load(f)
        
        # file_list should be a list of absolute paths
        success = merge_word_files(file_list, output_path)
        
        if success:
            print("Merge completed successfully")
            sys.exit(0)
        else:
            print("Merge failed")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Main execution error: {str(e)}")
        sys.exit(1)
