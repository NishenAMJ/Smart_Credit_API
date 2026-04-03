import { ScrollView,
        View ,
        StyleSheet,
        Text
    } from "react-native";


const COLORS = {
  primary: '#007AFF',
  background: '#F5F6FA',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  success: '#10B981',
  warning: '#F59E0B',
};


export default function LenderProfileScreen(){
    return(
        <ScrollView>
            <ScrollView>
                <View style= {styles.header}>
                    <Text style= {styles.header_title}>Profile</Text>
                </View>

                <view>
                    
                </view>
            </ScrollView>
        </ScrollView>
    )
}



const styles= StyleSheet.create({
    header:{
        backgroundColor: COLORS.primary,   
        padding: 16,

    },

    header_title:{

    }
})